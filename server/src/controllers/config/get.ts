import { NextFunction, Request, Response } from "express";
import * as ConfigAPITypes from "../../../../shared/api/config";

import LoggingService from "../../services/logging";
import ConfigModel from "../../models/Config";

const handler = async (
  _req: Request<{}, {}, {}>,
  res: Response<ConfigAPITypes.GetConfigResponseData>,
  _next: NextFunction,
) => {
  try {
    const config = await ConfigModel.findOne({});

    // If no config is found, then create a new one
    if (!config) {
      const newConfig = new ConfigModel({
        currency: "LPS",

        // Taxes
        taxes: [
          {
            name: "ISV",
            rate: 0.15,
          },
        ],

        // Rounding
        roundingMethod: "bankers",

        // Permissions (fine-grained per action & module)
        permissions: {},

        // Discounts & Promotions
        discountPermissions: [],

        // Invoice Settings
        invoiceNumberRange: {
          start: 0,
          end: 10000,
          current: 0,
        },

        // Inventory
        inventorySettings: {
          autoReplenishment: false,
          lowStockAlerts: true,
        },

        // Notifications
        notifications: {
          email: true,
          sms: true,
          push: true,
        },
      });
      await newConfig.save();
      res.status(200).send({
        status: "success",
        config: newConfig,
      });
      return;
    }

    // Send success response
    res.status(200).send({
      status: "success",
      config,
    });
  } catch (error: Error | any) {
    // Respond with a generic internal error
    res.status(500).json({ status: "internal-error" });

    // Log unexpected errors with stack trace
    LoggingService.log({
      source: "system",
      level: "error",
      traceId: _req.headers["x-trace-id"] as string,
      message: "Unexpected error during config retrieval",
      details: { error: error.message, stack: error.stack },
    });
  }
};

export default handler;
