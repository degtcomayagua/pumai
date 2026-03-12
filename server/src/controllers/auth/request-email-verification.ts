import AccountsModel from "../../models/Account";
import { IAccount } from "../../../../shared/models/account";

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import dayJs from "dayjs";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, {}>,
  res: Response<AuthAPITypes.RequestAccountEmailVerificationResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();

  const account = req.user as IAccount;

  try {
    session.startTransaction();
    if (account.email.verified)
      throw new APIError<
        AuthAPITypes.RequestAccountEmailVerificationResponseData["status"]
      >("email-already-verified", 400);

    let token = uuidv4();
    while (
      await AccountsModel.exists({ "email.verificationToken": token }).session(
        session,
      )
    ) {
      token = uuidv4();
    }

    await updateUserAccountWithRetry({
      accountId: account._id.toString(),
      email: {
        verificationToken: token,
        verificationTokenExpires: dayJs().add(1, "day").toDate(),
      },
    });

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

    res.status(200).send({
      status: "success",
    });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:request-email-verification",
        level: "error",
        message: "Unexpected error during email email verification request",
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
