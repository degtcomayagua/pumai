import AccountUtils from "../../utils/accounts";
import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.ChangePasswordRequestBody>,
  res: Response<AuthAPITypes.ChangePasswordResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const { currentPassword, newPassword } = req.body;

  try {
    // Verify the password
    const verifyPasswordResult = AccountUtils.verifyPassword(
      account.preferences.security.password,
      currentPassword,
    );
    if (!verifyPasswordResult)
      throw new APIError<AuthAPITypes.ChangePasswordResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    // Update the account with the new password
    await updateUserAccountWithRetry(
      {
        accountId: account._id.toString(),
        preferences: { security: { password: newPassword } },
      },
      {
        adminAccount: account,
        traceId: req.traceId,
      },
    );

    // Send the email verification email
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
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    // Log the error
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:change-password",
        level: "error",
        message: "Unexpected error during password change",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        metadata: {
          createdBy: account?._id,
          createdAt: new Date(),
        },
      });
    }
    res.status(500).send({ status: "internal-error" });
  }
};

export default handler;
