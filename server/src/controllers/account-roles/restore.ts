import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles.js";

import LoggingService from "../../services/logging.js";
import {
  AccountRoleNotFoundError,
  restoreAccountRoleWithRetry,
} from "../../services/account-roles/restore.js";

import { Prisma } from "@prisma/client";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.RestoreRequestBody>,
  res: Response<AccountRolesAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleId } = req.body;
  const userAccount = req.user!;

  try {
    const restoredRole = await restoreAccountRoleWithRetry(roleId, {
      traceId: req.traceId,
      userAccount,
    });

    res.status(200).json({
      status: "success",
      accountRole: restoredRole,
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
          code: error,
          meta: error,
        },
        duration,
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
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
