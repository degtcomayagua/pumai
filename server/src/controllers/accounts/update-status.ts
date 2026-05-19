import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts.js";

import prismaClient from "../../config/prisma.js";
import { updateAccountWithRetry } from "../../services/accounts/update.js";

import LoggingService from "../../services/logging.js";
import { APIError } from "../../errors/api.js";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.UpdateStatusRequestBody>,
  res: Response<AccountAPITypes.UpdateStatusResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const userAccount = req.user!;
  const { accountId, newStatus } = req.body;

  try {
    const roleLevelOfAccountToUpdate = await prismaClient.account.findUnique({
      where: { id: accountId },
      select: {
        role: {
          select: {
            level: true,
          },
        },
      },
    });

    if (!roleLevelOfAccountToUpdate) {
      throw new APIError<AccountAPITypes.UpdatePasswordResponseData["status"]>(
        "account-not-found",
        404,
      );
    }

    const adminRoleLevel = userAccount.role.level ?? 1000;
    if (roleLevelOfAccountToUpdate.role.level <= adminRoleLevel) {
      throw new APIError<AccountAPITypes.UpdatePasswordResponseData["status"]>(
        "cannot-change-password-due-to-role-level",
        401,
      );
    }

    await updateAccountWithRetry(
      {
        accountId,
        status: newStatus,
      },
      {
        traceId: req.traceId,
        userAccount: userAccount,
      },
    );

    res.status(200).json({
      status: "success",
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;
    console.log(error);

    if (error instanceof APIError) {
      res.status(error.httpStatus).json({ status: error.status });
      return;
    }

    LoggingService.log({
      source: "api:accounts:update-password",
      level: "error",
      message: "Unexpected error during account password update",
      traceId: req.traceId,
      duration,
      details: {
        error: (error as any)?.message,
        stack: (error as any)?.stack,
        accountId,
      },
    });

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
