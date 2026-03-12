import AccountsModel from "../../models/Account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.ResetPasswordRequestBody>,
  res: Response<AuthAPITypes.ResetPasswordResponseData>,
  _next: NextFunction,
) => {
  const { token, newPassword } = req.body;

  try {
    const account = await AccountsModel.findOne({
      "preferences.security.forgotPasswordToken": token,
      "preferences.security.forgotPasswordTokenExpires": { $gt: new Date() },
      "metadata.deleted": { $ne: true },
    });

    if (!account)
      throw new APIError<AuthAPITypes.ResetPasswordResponseData["status"]>(
        "invalid-token",
        400,
      );

    await updateUserAccountWithRetry({
      accountId: account._id.toString(),
      preferences: {
        security: {
          forgotPasswordToken: null,
          forgotPasswordTokenExpires: null,
          lastPasswordChange: new Date(),
          password: newPassword, // Hashed within service
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
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:reset-password",
        level: "error",
        message: "Unexpected error during password reset",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        metadata: {
          createdAt: new Date(),
        },
      });
    }
    res.status(500).send({ status: "internal-error" });
  }
};

export default handler;
