import { NextFunction, Request, Response } from "express";
import * as ConfigAPITypes from "../../../../shared/api/config";

import LoggingService from "../../services/logging";
import type { IAccount } from "../../../../shared/models/account";
import { updateConfig } from "../../services/config/update";
import { IConfig } from "../../../../shared/models/config";

const handler = async (
  req: Request<{}, {}, ConfigAPITypes.UpdateConfigRequestBody>,
  res: Response<ConfigAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  try {
    const adminAccount = req.user as IAccount;

    const updatedConfig = await updateConfig(
      {
        ...(req.body as Partial<Omit<IConfig, "metadata">>),
      },
      {
        traceId: req.traceId,
        adminAccount,
      },
    );

    if (!updatedConfig) {
      res.status(404).send({ status: "not-found" });
      return;
    }

    LoggingService.log({
      source: "api:config:update",
      level: "critical",
      message: "User updated configuration",
      details: {
        configId: updatedConfig._id.toString(),
        accountId: adminAccount._id.toString(),
      },
      _references: {
        accountId: "Account",
        configId: "Config",
        terminalId: "Terminal",
      },
      traceId: req.headers["x-trace-id"] as string | undefined,
    });

    res.status(200).send({
      status: "success",
      config: updatedConfig,
    });
  } catch (error: Error | any) {
    LoggingService.log({
      source: "system",
      level: "error",
      message: "Unexpected error during config update",
      traceId: req.headers["x-trace-id"] as string | undefined,
      details: { error: error.message, stack: error.stack },
    });

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
