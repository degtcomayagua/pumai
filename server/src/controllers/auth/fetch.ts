import AccountUtils from "../../utils/accounts.js";

import { NextFunction, Request, Response } from "express";
import * as AccountAPITypes from "../../../../shared/api/auth.js";

const handler = async (
  req: Request,
  res: Response<AccountAPITypes.FetchResponseData>,
  _next: NextFunction,
) => {
  const account = req.user!; // Middleware verifies the user is logged in
  const accountSession = await AccountUtils.createSessionAccount(account);

  res.status(200).send({
    status: "success",
    account: accountSession,
  });
};

export default handler;
