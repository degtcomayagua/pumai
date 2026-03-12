import AccountsModel from "../../models/Account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
//import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.VerifyAccountEmailRequestBody>,
  res: Response<AuthAPITypes.VerifyAccountEmailResponseData>,
  _next: NextFunction,
) => {
  const { token } = req.body;

  try {
    const account = await AccountsModel.findOne({
      "email.verificationToken": token,
      "email.verificationTokenExpires": { $gt: new Date() },
      deleted: false,
    });

    await updateUserAccountWithRetry({
      accountId: account!._id.toString(),
      email: {
        verified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

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
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:verify-email",
        level: "error",
        message: "Unexpected error during email verification",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        metadata: {
          createdAt: new Date(),
        },
      });
    }
    res.status(500).send({ status: "internal-error" });

    res.status(500).send({
      status: "internal-error",
    });
  }
};

export default handler;
