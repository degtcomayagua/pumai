import { Request, Response, NextFunction } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts";

import { IAccount } from "../../../../shared/models/account";
import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";
import {
  AccountNotFoundError,
  CannotDeleteSelfError,
  deleteUserAccountWithRetry,
} from "../../services/accounts/delete";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.DeleteRequestBody>,
  res: Response<AccountsAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const adminAccount = req.user as IAccount;
  const { accountId } = req.body;

  try {
    const adminId = adminAccount.id;

    if (adminId === accountId) {
      throw new CannotDeleteSelfError("Cannot delete your own account");
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

    const targetRoleLevel = accountToBeDeleted.role?.level;
    const adminRoleLevel = adminAccount.role?.level;

    if (
      typeof targetRoleLevel === "number" &&
      typeof adminRoleLevel === "number" &&
      targetRoleLevel <= adminRoleLevel
    ) {
      throw new APIError<AccountsAPITypes.DeleteResponseData["status"]>(
        "cannot-delete-due-to-role-level",
        401,
      );
    }

    await deleteUserAccountWithRetry(accountId, {
      userAccount: adminAccount,
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
        metadata: {
          createdBy: (adminAccount as any)?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
