import type { IAccount } from "../../../../shared/models/account";

import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

import LoggingService from "../../services/logging";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

const handler = async (
  req: Request<{}, {}, AuthAPITypes.UpdatePreferencesRequestBody>,
  res: Response<AuthAPITypes.UpdatePreferencesResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount;
  const {} = req.body;

  try {
    await updateUserAccountWithRetry({
      accountId: account!._id.toString(),
      preferences: {},
    });

    res.status(200).send({ status: "success" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:auth:update-preferences",
        level: "error",
        message: "Unexpected error during update preferences",
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
