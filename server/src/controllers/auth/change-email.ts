import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

import AccountsModel from "../../models/Account";
import AccountUtils from "../../utils/accounts";
import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.ChangeEmailRequestBody>,
  res: Response<AuthAPITypes.ChangeEmailResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const { password, newEmail } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const verifyPasswordResult = AccountUtils.verifyPassword(
      account.preferences.security.password,
      password,
    );
    if (!verifyPasswordResult)
      throw new APIError<AuthAPITypes.ChangeEmailResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    let verificationToken = uuidv4();
    while (
      await AccountsModel.exists({
        "email.verificationToken": verificationToken,
      }).session(session)
    ) {
      verificationToken = uuidv4();
    }

    await updateUserAccountWithRetry(
      {
        accountId: account._id.toString(),
        email: { value: newEmail.toLowerCase() },
      },
      {
        session,
        adminAccount: account,
        traceId: req.traceId,
      },
    );

    await session.commitTransaction();

    if (
      process.env.NODE_ENV === "production" &&
      process.env.EMAIL_SERVICE_ENABLED === "true"
    ) {
      //const emailToSend = await EmailService.getEmailHTMLTemplate(
      //	"email-verification",
      //	account.preferences.general.language,
      //	{
      //		emailVerificationURL: `${process.env.WEB_URL}/verify-email?token=${verificationToken}`,
      //	},
      //);
      //EmailService.sendEmail(newEmail, "Verify your email", emailToSend);
    }

    res.status(200).send({ status: "success" });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:change-email",
        level: "error",
        message: "Unexpected error during email change",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        metadata: {
          createdBy: account?._id,
          createdAt: new Date(),
        },
      });
    }
    res.status(500).send({ status: "internal-error" });
  } finally {
    await session.endSession();
  }
};

export default handler;
