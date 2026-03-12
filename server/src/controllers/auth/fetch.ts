import type { IAccount } from "../../../../shared/models/account";
import AccounUtils from "../../utils/accounts";

import { NextFunction, Request, Response } from "express";
import * as AccountAPITypes from "../../../../shared/api/auth";

const handler = async (
  req: Request,
  res: Response<AccountAPITypes.FetchResponseData>,
  _next: NextFunction,
) => {
  const account = req.user as IAccount; // Middleware verifies the user is logged in
  const accountSession = await AccounUtils.createSessionAccount(account);

  res.status(200).send({
    status: "success",
    account: accountSession,
  });
};

export default handler;
