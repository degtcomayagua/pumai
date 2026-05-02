import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../../../generated/prisma/client";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

import LoggingService from "../../services/logging";
import { createAccountRoleWithRetry } from "../../services/account-roles/create";
import prismaClient from "../../config/prisma";

/**
 * Error thrown when an admin attempts to create a role
 * at a level equal to or higher privilege than their own.
 */
class CannotCreateRoleAtThisLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotCreateRoleAtThisLevelError";
  }
}

/**
 * Error thrown when a role level is already in use.
 */
class LevelInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LevelInUseError";
  }
}

/**
 * Safely resolves a value into a numeric ID.
 */
const resolveNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.CreateRequestBody>,
  res: Response<AccountRolesAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { name, description, level } = req.body;

  const adminAccount = req.user as IAccount;

  try {
    const adminAccountLevel =
      (adminAccount.data.role as IAccountRole | undefined)?.level ?? 0;
    if (level <= adminAccountLevel) {
      throw new CannotCreateRoleAtThisLevelError(
        "Cannot create a role at this level or lower than your own.",
      );
    }

    if (adminAccountLevel === undefined) {
      throw new CannotCreateRoleAtThisLevelError(
        "Admin account does not have a valid role level.",
      );
    }

    const existingRole = await prismaClient.accountRole.findFirst({
      where: {
        level,
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
        userAccount: adminAccount,
        traceId: req.traceId,
      },
    );

    const duration = performance.now() - start;

    LoggingService.log({
      source: "api:account-roles:create",
      level: "info",
      message: "Account role created successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount.id,
        accountRoleId: createdRole._id,
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount.id,
      },
    });

    res.status(201).json({
      status: "success",
      accountRole: createdRole as unknown as IAccountRole,
    });
  } catch (error: unknown) {
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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:account-roles:create",
        level: "error",
        message: "Prisma error during account role creation",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        metadata: {
          createdAt: new Date(),
          createdBy: resolveNumericId(adminAccount.id),
        },
      });
    } else if (error instanceof Error) {
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
          createdBy: resolveNumericId(adminAccount.id),
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
