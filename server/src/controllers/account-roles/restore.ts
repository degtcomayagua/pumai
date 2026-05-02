import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";
import LoggingService from "../../services/logging";
import {
  AccountRoleNotFoundError,
  restoreAccountRoleWithRetry,
} from "../../services/account-roles/restore";
import { Prisma } from "../../../../generated/prisma/client";
import { IAccountRole } from "../../../../shared/models/account-role";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.RestoreRequestBody>,
  res: Response<AccountRolesAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const restoredRole = await restoreAccountRoleWithRetry(roleId, {
      traceId: req.traceId,
      userAccount: adminAccount,
    });

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:restore",
      level: "info",
      message: "Account role restored successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
        accountRoleId: (restoredRole as any)?.id?.toString?.(),
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount?.id,
      },
    });

    res.status(200).json({
      status: "success",
      accountRole: restoredRole as unknown as IAccountRole,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof AccountRoleNotFoundError) {
      res.status(404).json({
        status: "role-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:account-roles:restore",
        level: "error",
        message: "Prisma error during account role restore",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:restore",
        level: "error",
        message: "Error during account role restore",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
