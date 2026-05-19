import { Request, Response, NextFunction } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts.js";

import prismaClient from "../../config/prisma.js";

import LoggingService from "../../services/logging.js";
import {
  AccountNotFoundError,
  deleteAccountWithRetry,
} from "../../services/accounts/delete.js";

import { APIError } from "../../errors/api.js";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.DeleteRequestBody>,
  res: Response<AccountsAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const userAccount = req.user!;
  const { accountId } = req.body;

  try {
    const adminId = userAccount.id;

    if (adminId === accountId) {
      console.log(
        "some jackass is trying to delete their own account, blame on",
        userAccount.email,
      );
      throw new APIError<AccountsAPITypes.DeleteResponseData["status"]>(
        "cannot-delete-self",
        400,
      );
    }

    const accountToBeDeleted = await prismaClient.account.findUnique({
      where: { id: accountId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!accountToBeDeleted) {
      throw new AccountNotFoundError("Account not found");
    }

    const accountToDeleteRoleLevel = accountToBeDeleted.role?.level;
    const deletedByRoleLevel = userAccount.role?.level;

    if (
      typeof accountToDeleteRoleLevel === "number" &&
      typeof deletedByRoleLevel === "number" &&
      accountToDeleteRoleLevel <= deletedByRoleLevel
    ) {
      throw new APIError<AccountsAPITypes.DeleteResponseData["status"]>(
        "cannot-delete-due-to-role-level",
        401,
      );
    }

    await deleteAccountWithRetry(accountId, {
      userAccount: userAccount,
      traceId: req.traceId,
    });

    res.status(200).json({ status: "success" });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:delete",
        level: "error",
        message: "Unexpected error during user deletion",
        details: {
          error: error.message,
          stack: error.stack,
          traceId: req.traceId,
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
