import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts";
import LoggingService from "../../services/logging";
import {
  restoreAccountWithRetry,
  AccountNotFoundError,
} from "../../services/accounts/restore";
import { Prisma } from "../../../generated/prisma/client";
import { IAccount } from "../../../../shared/models/account";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.RestoreRequestBody>,
  res: Response<AccountAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { accountId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const restoredAccount = await restoreAccountWithRetry(accountId, {
      traceId: req.traceId,
      adminAccount,
    });

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:accounts:restore",
      level: "info",
      message: "Account restored successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
        accountRoleId: (restoredAccount as any)?.id?.toString?.(),
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount?.id,
      },
    });

    res.status(200).json({
      status: "success",
      account: restoredAccount as unknown as IAccount,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof AccountNotFoundError) {
      res.status(404).json({
        status: "account-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:accounts:restore",
        level: "error",
        message: "Prisma error during account restore",
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
        source: "api:accounts:restore",
        level: "error",
        message: "Error during account restore",
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
