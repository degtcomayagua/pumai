import { v4 as uuidv4 } from "uuid";
import dayJs from "dayjs";

import AccountsModel from "../../models/Account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.ForgotPasswordRequestBody>,
  res: Response<AuthAPITypes.ForgotPasswordResponseData>,
  _next: NextFunction,
) => {
  // There's no account session in this request
  const { email } = req.body;

  try {
    const account = await AccountsModel.findOne({
      "email.value": email.toLowerCase(),
      deleted: false,
    });
    if (!account) {
      res.status(404).send({
        status: "account-not-found",
      });
      return;
    }

    let token = uuidv4();
    while (
      await AccountsModel.findOne({
        "preferences.security.forgotPasswordToken": token,
        deleted: false,
      })
    ) {
      token = uuidv4();
    }

    await updateUserAccountWithRetry({
      accountId: account._id.toString(),
      preferences: {
        security: {
          forgotPasswordToken: token,
          forgotPasswordTokenExpires: dayJs().add(1, "hour").toDate(),
        },
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
  } catch (error: any) {
    // Log the action
    LoggingService.log({
      level: "error",
      source: "auth:forgot-password",
      message: "Error requesting password reset",
      details: {
        email: email,
        message: error.message,
        stack: error.stack,
      },
    });

    res.status(500).send({
      status: "internal-error",
    });
  }
};

export default handler;
