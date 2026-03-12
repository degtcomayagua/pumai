import { NextFunction, Request, Response } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts";

import AccountsModel from "../../models/Account";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.GetRequestBody>,
  res: Response<AccountsAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const { accountIds, fields } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const projection = fields?.reduce(
      (acc, field) => {
        acc[field] = 1;
        return acc;
      },
      {} as Record<string, 1>,
    );

    const accounts = await AccountsModel.find(
      {
        _id: { $in: accountIds },
        deleted: false,
      },
      projection,
    );

    res.status(200).send({
      status: "success",
      accounts,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:get",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during user fetching",
        details: {
          error: error.message,
          stack: error.stack,
          accountIds: req.body.accountIds?.join(", "),
        },
        _references: {
          accountIds: "Account",
        },
        metadata: {
          createdBy: adminAccount?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
