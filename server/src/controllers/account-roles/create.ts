import { Request, Response, NextFunction } from "express";
import { AccountRole, Prisma } from "@prisma/client";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles.js";

import LoggingService from "../../services/logging.js";
import { createAccountRoleWithRetry } from "../../services/account-roles/create.js";

import prismaClient from "../../config/prisma.js";

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
  const start = performance.now();
  const { name, description, level } = req.body;

  const userAccount = req.user!; // We can assert this because the route should be protected by authentication middleware

  try {
    const userAccountRoleLevel = userAccount.role.level ?? 0;
    if (level <= userAccountRoleLevel) {
      throw new CannotCreateRoleAtThisLevelError(
        "Cannot create a role at this level or lower than your own.",
      );
    }

    if (userAccountRoleLevel === undefined) {
      throw new CannotCreateRoleAtThisLevelError(
        "User account does not have a valid role level.",
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
        userAccount,
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
      details: {
        accountRoleId: createdRole.id,
        createdById: userAccount.id,
        name,
        level,
      },
      _references: {
        accountRoleId: "AccountRole",
        createdById: "Account",
      },
    });

    res.status(201).json({
      status: "success",
      accountRole: createdRole as unknown as AccountRole,
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
          code: error,
          meta: error,
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
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
