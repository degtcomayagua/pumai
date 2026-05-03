import passport from "passport";

import LoggingService from "../../services/logging.js";

import AccountUtils from "../../utils/accounts.js";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth.js";

import { AccountWithRole } from "../../types/index.js";

const handler = (
  req: Request<{}, {}, AuthAPITypes.LoginRequestBody>,
  res: Response<AuthAPITypes.LoginResponseData>,
  next: NextFunction,
) => {
  try {
    passport.authenticate(
      "local",
      (err: any, user: AccountWithRole | null, info: any) => {
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
    });
    res.status(500).send({ status: "internal-error" });
  }
};

export default handler;
