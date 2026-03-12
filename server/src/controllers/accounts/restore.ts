import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts";
import { IAccount } from "../../../../shared/models/account";

import AccountModel from "../../models/Account";

import LoggingService from "../../services/logging";
import { restoreAccountWithRetry } from "../../services/accounts/restore";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.RestoreRequestBody>,
  res: Response<AccountAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const { accountId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    session.startTransaction();

    // Check if the account exists
    const account = await AccountModel.findById(
      new mongoose.Types.ObjectId(accountId),
    ).session(session);
    if (!account) {
      throw new APIError<AccountAPITypes.RestoreResponseData["status"]>(
        "account-not-found",
        404,
      );
    }

    const restoredAccount = await restoreAccountWithRetry(accountId, {
      session,
      traceId: req.traceId,
      adminAccount,
    });

    await session.commitTransaction();

    res.status(200).json({
      status: "success",
      account: restoredAccount,
    });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:restore",
        level: "error",
        message: "Error during account restore",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount._id,
        },
      });
    }
    res.status(500).json({
      status: "internal-error",
    });
  } finally {
    await session.endSession();
  }
};

export default handler;
