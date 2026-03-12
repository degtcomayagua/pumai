import AccountUtils from "../../utils/accounts";
import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.DisableTFARequestBody>,
  res: Response<AuthAPITypes.DisableTFAResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const { password, tfaCode } = req.body;

  if (account.preferences.security.tfaSecret === null)
    throw new APIError<AuthAPITypes.DisableTFAResponseData["status"]>(
      "tfa-not-enabled",
      401,
    );

  try {
    const verifyPasswordResult = AccountUtils.verifyPassword(
      account.preferences.security.password,
      password,
    );
    if (!verifyPasswordResult)
      throw new APIError<AuthAPITypes.DisableTFAResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    // Validate the TFA code
    const validCode = AccountUtils.verifyTFA(
      account.preferences.security.tfaSecret!,
      tfaCode,
    );
    if (!validCode)
      throw new APIError<AuthAPITypes.DisableTFAResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    // Disable TFA for the account
    await updateUserAccountWithRetry(
      {
        accountId: account._id.toString(),
        preferences: { security: { tfaSecret: null } },
      },
      {
        traceId: req.traceId,
        adminAccount: account,
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

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:disable-tfa",
        level: "error",
        message: "Unexpected error during TFA disable",
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
