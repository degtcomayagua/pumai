import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import {
  AccountRoleNotFoundError,
  updateAccountRole,
} from "../../services/account-roles/update";

import AccountRoleModel from "../../models/AccountRole";
import { IAccountRole } from "../../../../shared/models/account-role";

class CannotUpdateRoleAtThisLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotCreateRoleAtThisLevelError";
  }
}

class LevelInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LevelInUseError";
  }
}

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.UpdateRequestBody>,
  res: Response<AccountRolesAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const { roleId, name, description, level, requiresTwoFactor, permissions } =
    req.body;
  const adminAccount = req.user as IAccount;

  try {
    session.startTransaction();

    // Validate that the level is unique and that the account can update roles at this level
    const adminAccountLevel =
      (adminAccount.data.role as IAccountRole).level || 0;
    if (level) {
      if (level < adminAccountLevel)
        throw new CannotUpdateRoleAtThisLevelError(
          "Cannot create a role at this level or lower than your own.",
        );

      const existingRole = await AccountRoleModel.exists({
        level,
        _id: { $ne: roleId },
        "metadata.deleted": { $ne: true },
      });
      if (existingRole)
        throw new LevelInUseError(`A role with level ${level} already exists.`);
    }

    const updatedRole = await updateAccountRole(
      {
        roleId,
        name,
        description,
        level,
        requiresTwoFactor,
        permissions,
        // isSystemRole is deliberately not updateable
      },
      {
        session,
        traceId: req.traceId,
        adminAccount,
      },
    );

    await session.commitTransaction();

    res.status(200).json({
      status: "success",
      accountRole: updatedRole,
    });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof AccountRoleNotFoundError) {
      res.status(404).json({
        status: "role-not-found",
      });
    }

    if (error instanceof LevelInUseError) {
      res.status(409).json({
        status: "level-in-use",
      });
      return;
    }

    if (error instanceof CannotUpdateRoleAtThisLevelError) {
      res.status(403).json({
        status: "level-too-high",
      });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:update",
        level: "error",
        message: "Error during account role update",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount._id,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  } finally {
    await session.endSession();
  }
};

export default handler;
