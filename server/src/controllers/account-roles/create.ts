import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import { createAccountRoleWithRetry } from "../../services/account-roles/create";

import AccountRoleModel from "../../models/AccountRole";
import { IAccountRole } from "../../../../shared/models/account-role";

class CannotCreateRoleAtThisLevelError extends Error {
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
  req: Request<{}, {}, AccountRolesAPITypes.CreateRequestBody>,
  res: Response<AccountRolesAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const { name, description, level } = req.body;

  const adminAccount = req.user as IAccount;

  try {
    session.startTransaction();

    // Validate that the level is unique and that the account can create roles at this level
    const adminAccountLevel =
      (adminAccount.data.role as IAccountRole).level || 0;
    if (level <= adminAccountLevel)
      throw new CannotCreateRoleAtThisLevelError(
        "Cannot create a role at this level or lower than your own.",
      );

    const existingRole = await AccountRoleModel.exists({
      level,
      "metadata.deleted": { $ne: true },
    });
    if (existingRole)
      throw new LevelInUseError(`A role with level ${level} already exists.`);

    const createdRole = await createAccountRoleWithRetry(
      {
        name,
        description,
        level,
        isSystemRole: false,
        requiresTwoFactor: false,
        permissions: [],
      },
      {
        session,
        adminAccount,
        traceId: req.traceId,
      },
    );

    await session.commitTransaction();

    res.status(201).json({
      status: "success",
      accountRole: createdRole,
    });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof LevelInUseError) {
      res.status(409).json({
        status: "level-in-use",
      });
      return;
    }

    if (error instanceof CannotCreateRoleAtThisLevelError) {
      res.status(403).json({
        status: "level-too-high",
      });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:create",
        level: "error",
        message: "Error during account role creation",
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
