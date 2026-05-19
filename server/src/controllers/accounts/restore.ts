import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts.js";
import LoggingService from "../../services/logging.js";
import {
  restoreAccountWithRetry,
  AccountNotFoundError,
} from "../../services/accounts/restore.js";

import { Prisma } from "@prisma/client";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.RestoreRequestBody>,
  res: Response<AccountAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { accountId } = req.body;
  const userAccount = req.user!;

  try {
    const restoredAccount = await restoreAccountWithRetry(accountId, {
      traceId: req.traceId,
      userAccount,
    });

    res.status(200).json({
      status: "success",
      account: restoredAccount,
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
          code: error,
          meta: error,
        },
        duration,
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
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
