import passport from "passport";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import AccountUtils from "../../utils/accounts";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import { IAccount } from "../../../../shared/models/account";

const handler = (
  req: Request<{}, {}, AuthAPITypes.LoginRequestBody>,
  res: Response<AuthAPITypes.LoginResponseData>,
  next: NextFunction,
) => {
  try {
    passport.authenticate(
      "local",
      (err: any, user: IAccount | null, info: any) => {
        if (err) {
          next(err);
          return;
        }

        if (!user) {
          res.status(403).send({
            status: info.message,
          });
          return;
        } else {
          req.logIn(user, async (err) => {
            if (err) {
              next(err);
              return;
            }

            // Alert the user of their successful login
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
              account: await AccountUtils.createSessionAccount(user),
            });
          });
        }
      },
    )(req, res, next);
  } catch (error: any) {
    LoggingService.log({
      source: "api:auth:change-email",
      level: "error",
      message: "Unexpected error during email change",
      traceId: req.traceId,
      details: { error: error.message, stack: error.stack },
      metadata: {
        createdAt: new Date(),
      },
    });
    res.status(500).send({ status: "internal-error" });
  }
};

export default handler;
