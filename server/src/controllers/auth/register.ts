import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import AccountUtils from "../../utils/accounts";

import AccountsModel from "../../models/Account";
import AccountRoleModel from "../../models/AccountRole";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { createUserAccountWithRetry } from "../../services/accounts/create";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.RegisterRequestBody>,
  res: Response<AuthAPITypes.RegisterResponseData>,
  _next: NextFunction,
) => {
  const { email, password, name } = req.body;

  try {
    // There has to be at least 1 role
    const lowestRoleId = await AccountRoleModel.findOne(
      {},
      { sort: { level: 1 } },
    );
    if (!lowestRoleId) {
      throw new APIError<AuthAPITypes.RegisterResponseData["status"]>(
        "no-roles-defined",
        400,
      );
    }

    const isEmailInUse = await AccountsModel.exists({
      "email.value": email.toLowerCase(),
    });
    if (isEmailInUse) {
      throw new APIError<AuthAPITypes.RegisterResponseData["status"]>(
        "email-in-use",
        400,
      );
    }

    const account = await createUserAccountWithRetry({
      email: email.toLowerCase(),
      password: password, // Hashed within service
      name: name,
      roleId: lowestRoleId!._id.toString(),
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

    // Log in the user
    await new Promise<void>((resolve, reject) => {
      req.login(account, async (err) => {
        if (err) return reject(err);
        res.status(200).send({
          status: "success",
          account: await AccountUtils.createSessionAccount(account),
        });
        resolve();
      });
    });
  } catch (error: any) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:register",
        level: "error",
        message: "Unexpected error during account registration",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        metadata: {
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
