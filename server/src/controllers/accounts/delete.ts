import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts";

import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";
import AccountModel from "../../models/Account";

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
  const session = await mongoose.startSession();
  const adminAccount = req.user as IAccount;
  const { accountId } = req.body;

  try {
    session.startTransaction();

    if (adminAccount._id.toString() === accountId)
      throw new CannotDeleteSelfError("Cannot delete your own account");

    const accountToBeDeleted = await AccountModel.findById(
      new mongoose.Types.ObjectId(accountId),
    )
      .populate("data.role", "level")
      .select("data.role");
    if (!accountToBeDeleted)
      throw new AccountNotFoundError("Account not found");
    if (
      (accountToBeDeleted.data.role as IAccountRole).level <=
      (adminAccount.data.role as IAccountRole).level
    ) {
      throw new APIError<AccountsAPITypes.DeleteResponseData["status"]>(
        "cannot-delete-due-to-role-level",
        401,
      );
    }

    await deleteUserAccountWithRetry(accountId, {
      session,
      adminAccount,
      traceId: req.traceId,
    });

    await session.commitTransaction();

    res.status(200).json({ status: "success" });
  } catch (error: unknown) {
    await session.abortTransaction();

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
          createdBy: adminAccount?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  } finally {
    await session.endSession();
  }
};

export default handler;
