import AccountUtils from "../../utils/accounts";
import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { deleteUserAccountWithRetry } from "../../services/accounts/delete";

import { APIError } from "../../errors/api";

export class MissingTFAError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "MissingTFAError";
  }
}

const handler = async (
  req: Request<{}, {}, AuthAPITypes.DeleteRequestBody>,
  res: Response<AuthAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const { password, tfaCode } = req.body;

  // Contrary to popular belief, users need permission to delete their accounts
  // Why? Because it's not like they're gonna go around the app, delete their account and then
  // Go harrass an admin to get their account back

  try {
    // Verify the password and TFA code
    if (
      !AccountUtils.verifyPassword(
        account.preferences.security.password,
        password,
      )
    )
      throw new APIError<AuthAPITypes.ChangePasswordResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    // If the user has 2fa active, then verify it
    if (account.preferences.security.tfaSecret !== null) {
      if (!tfaCode)
        throw new APIError<AuthAPITypes.DeleteResponseData["status"]>(
          "missing-tfa-code",
          401,
        );
      if (
        !AccountUtils.verifyTFA(
          account.preferences.security.tfaSecret!,
          tfaCode,
        )
      )
        throw new APIError<AuthAPITypes.DeleteResponseData["status"]>(
          "invalid-tfa-code",
          401,
        );
    }

    // Delete the account
    await deleteUserAccountWithRetry(account._id.toString(), {
      allowDeleteSelf: true, // Allow self-deletion
      adminAccount: account, // Pass the account as the adminAccount
    });

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

    await new Promise<void>((resolve, reject) => {
      req.logout({ keepSessionInfo: false }, async (err) => {
        if (err) return reject(err);
        res.status(200).send({
          status: "success",
        });
        resolve();
      });
    });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:delete",
        message: `Failed to delete ${account.email.value}'s account.`,
        level: "error",
        traceId: req.traceId,
        details: {
          message: error.message,
          stack: error.stack,
        },
        metadata: {
          createdBy: account?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).send({
      status: "internal-error",
    });
  }
};

export default handler;
