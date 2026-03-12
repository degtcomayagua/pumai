import { Request, Response, NextFunction } from "express";

import * as StatsAPITypes from "../../../../shared/api/status";

const handler = async (
  _: Request<{}, {}, StatsAPITypes.PingResponseData>,
  res: Response<StatsAPITypes.PingResponseData>,
  _next: NextFunction,
) => {
  res.status(200).json({ status: "success" });
};

export default handler;
