import { NextFunction, Request, Response } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts";

import { IAccount } from "../../../../shared/models/account";
import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.GetRequestBody>,
  res: Response<AccountsAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const { accountIds, fields } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const select = fields?.reduce<Record<string, boolean>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});

    const accounts = await prismaClient.account.findMany({
      where: {
        id: { in: accountIds },
        metadata: { deleted: false },
      },
      ...(select ? { select } : {}),
    });

    res.status(200).send({
      status: "success",
      accounts:
        accounts as unknown as AccountsAPITypes.GetResponseData["accounts"],
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
          createdBy: (adminAccount as any)?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
