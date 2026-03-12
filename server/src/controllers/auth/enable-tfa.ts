import AccountsModel from "../../models/Account";
import AccountUtils from "../../utils/accounts";
import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.EnableTFARequestBody>,
  res: Response<AuthAPITypes.EnableTFAResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const { password, secret, tfaCode } = req.body;

  try {
    if (account.preferences.security.tfaSecret)
      throw new APIError<AuthAPITypes.EnableTFAResponseData["status"]>(
        "tfa-already-enabled",
        400,
      );

    const verifyPasswordResult = AccountUtils.verifyPassword(
      account.preferences.security.password,
      password,
    );
    if (!verifyPasswordResult)
      throw new APIError<AuthAPITypes.EnableTFAResponseData["status"]>(
        "invalid-credentials",
        401,
      );

    const validCode = AccountUtils.verifyTFA(secret, tfaCode);
    if (!validCode)
      throw new APIError<AuthAPITypes.EnableTFAResponseData["status"]>(
        "invalid-tfa-code",
        401,
      );

    await updateUserAccountWithRetry({
      accountId: account._id.toString(),
      preferences: { security: { tfaSecret: secret } },
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

    res.status(200).send({ status: "success" });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:enable-tfa",
        level: "error",
        message: "Unexpected error during TFA enablement",
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
