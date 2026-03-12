import { NextFunction, Request, Response } from "express";
import type * as AuthAPITypes from "../../../../shared/api/auth";

const handler = async (
  req: Request,
  res: Response<AuthAPITypes.LogoutResponseData>,
  next: NextFunction,
) => {
  req.logOut({ keepSessionInfo: false }, (err) => {
    if (err) {
      next(err);
    } else {
      res.send({
        status: "success",
      });
    }
  });
};

export default handler;
