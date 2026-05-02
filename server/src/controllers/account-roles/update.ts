import { Request, Response, NextFunction } from "express";
import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

import LoggingService from "../../services/logging";
import {
  AccountRoleNotFoundError,
  updateAccountRole,
} from "../../services/account-roles/update";

import { Prisma } from "../../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

/**
 * Error thrown when an admin attempts to update a role
 * below their own privilege level.
 */
class CannotUpdateRoleAtThisLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotUpdateRoleAtThisLevelError";
  }
}

/**
 * Error thrown when the requested role level is already in use.
 */
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
  const adminAccount = req.user as IAccount;

  try {
    const adminAccountLevel =
      (adminAccount.role as IAccountRole | undefined)?.level ?? 0;

    if (level !== undefined && level !== null) {
      if (level < adminAccountLevel) {
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

    const updatedRole = await updateAccountRole(
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
        userAccount: adminAccount,
      },
    );

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:update",
      level: "info",
      message: "Account role updated successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
        accountRoleId: (updatedRole as any)?.id?.toString?.(),
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount?.id,
      },
    });

    res.status(200).json({
      status: "success",
      accountRole: updatedRole as unknown as IAccountRole,
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
        details: { code: error.code, meta: error.meta },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:update",
        level: "error",
        message: "Error during account role update",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
