import { Request, Response, NextFunction } from "express";
import * as AccountRolesAPITypes from "../../../../shared/api/account-roles.js";

import LoggingService from "../../services/logging.js";
import {
  AccountRoleNotFoundError,
  updateAccountRoleWithRetry,
} from "../../services/account-roles/update.js";

import { Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma.js";

class CannotUpdateRoleAtThisLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotUpdateRoleAtThisLevelError";
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
  const start = performance.now();
  const { roleId, name, description, level, requiresTwoFactor, permissions } =
    req.body;
  const userAccount = req.user!;

  try {
    const userAccountRoleLevel = userAccount.role.level ?? 0;

    if (level !== undefined && level !== null) {
      if (level < userAccountRoleLevel) {
        throw new CannotUpdateRoleAtThisLevelError(
          "Cannot update a role at this level or lower than your own.",
        );
      }

      const existingRole = await prismaClient.accountRole.findFirst({
        where: {
          level,
          id: { not: roleId },
          metadata: {
            is: {
              deleted: false,
            },
          },
        },
        select: { id: true },
      });

      if (existingRole) {
        throw new LevelInUseError(`A role with level ${level} already exists.`);
      }
    }

    const roleToUpdate = await prismaClient.accountRole.findFirst({
      where: {
        id: roleId,
        metadata: {
          is: {
            deleted: false,
          },
        },
      },
      select: { id: true, level: true },
    });

    if (!roleToUpdate) {
      throw new AccountRoleNotFoundError("Account role not found or deleted");
    }

    if (
      (roleToUpdate.level !== undefined &&
        roleToUpdate.level < userAccountRoleLevel) ||
      roleToUpdate.level === -1 // Special case for default role with level -1
    ) {
      throw new CannotUpdateRoleAtThisLevelError(
        "Cannot update a role at this level or lower than your own.",
      );
    }

    const updatedRole = await updateAccountRoleWithRetry(
      {
        roleId,
        name,
        description,
        level,
        requiresTwoFactor,
        permissions,
      },
      {
        traceId: req.traceId,
        userAccount: userAccount,
      },
    );

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:update",
      level: "info",
      message: "Account role updated successfully",
      traceId: req.traceId,
      duration,
      details: {
        updatedById: userAccount.id,
        accountRole: updatedRole.id,
      },
      _references: {
        updatedById: "Account",
        accountRoleId: "AccountRole",
      },
    });

    res.status(200).json({
      status: "success",
      accountRole: updatedRole,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof AccountRoleNotFoundError) {
      res.status(404).json({ status: "role-not-found" });
      return;
    }

    if (error instanceof LevelInUseError) {
      res.status(409).json({ status: "level-in-use" });
      return;
    }

    if (error instanceof CannotUpdateRoleAtThisLevelError) {
      res.status(403).json({ status: "level-too-high" });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:account-roles:update",
        level: "error",
        message: "Prisma error during account role update",
        traceId: req.traceId,
        details: { code: error, meta: error },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:update",
        level: "error",
        message: "Error during account role update",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
