import mongoose from "mongoose";
import { performance } from "perf_hooks";

import ConfigModel from "../../models/Config";
import { IConfig } from "../../../../shared/models/config";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

type UpdateConfigOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  terminalId?: mongoose.Types.ObjectId;
  adminAccount?: IAccount; // The account that is updating the config, if applicable
};

type UpdateConfigParameters = Partial<Omit<IConfig, "metadata">> & {};

export class ConfigNotFoundError extends Error {
  retryable = false;
  constructor() {
    super("config-not-found");
    this.name = "ConfigNotFoundError";
  }
}

export async function updateConfig(
  params: UpdateConfigParameters,
  options: UpdateConfigOptions = {},
): Promise<IConfig> {
  const startTime = performance.now();

  let session = options.session;
  let sessionCreatedWithinService = false;
  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const config = await ConfigModel.findOne().session(session);
    if (!config) {
      throw new ConfigNotFoundError();
    }

    // Handle taxes soft delete
    if (params.taxes) {
      const incomingTaxIds = new Set(params.taxes.map((t) => t.id));
      // Mark as deleted taxes that exist in DB but are missing from params
      config.taxes.forEach((tax) => {
        if (!incomingTaxIds.has(tax.id) && !tax.deleted) {
          tax.deleted = true;
        }
      });

      // Update or add taxes from params
      params.taxes.forEach((incomingTax) => {
        const existingTax = config.taxes.find((t) => t.id === incomingTax.id);
        if (existingTax) {
          // Update existing tax properties (except id)
          existingTax.type = incomingTax.type;
          existingTax.name = incomingTax.name;
          existingTax.rate = incomingTax.rate;
          if (existingTax.deleted) existingTax.deleted = false; // restore if was deleted
        } else {
          // Add new tax (not deleted)
          config.taxes.push({ ...incomingTax, deleted: false });
        }
      });

      // Remove taxes from params to prevent Object.assign override
      delete params.taxes;
    }

    // Handle paymentMethods soft delete
    if (params.paymentMethods) {
      const incomingPaymentIds = new Set(
        params.paymentMethods.map((p) => p.id),
      );
      config.paymentMethods.forEach((pm) => {
        if (!incomingPaymentIds.has(pm.id) && !pm.deleted) {
          pm.deleted = true;
        }
      });

      params.paymentMethods.forEach((incomingPM) => {
        const existingPM = config.paymentMethods.find(
          (p) => p.id === incomingPM.id,
        );
        if (existingPM) {
          existingPM.name = incomingPM.name;
          existingPM.type = incomingPM.type;
          existingPM.enabled = incomingPM.enabled;
          if (existingPM.deleted) existingPM.deleted = false;
        } else {
          config.paymentMethods.push({ ...incomingPM, deleted: false });
        }
      });

      delete params.paymentMethods;
    }

    // Assign other params normally (excluding taxes and paymentMethods handled above)
    Object.assign(config, params);

    // Update metadata
    config.metadata.updatedAt = new Date();
    config.metadata.updatedBy = options.adminAccount
      ? options.adminAccount._id
      : undefined;

    (config.metadata.updateHistory ?? []).push({
      updatedAt: config.metadata.updatedAt,
      updatedBy: options.adminAccount ? options.adminAccount._id : undefined,
      changes: {
        ...params,
      },
    });

    await config.save({ session });

    LoggingService.log({
      source: "services:config:update",
      level: "important",
      message: "Config updated successfully",
      traceId: options.traceId,
      details: {
        configId: config._id.toString(),
        ...(options.adminAccount && {
          updatedBy: options.adminAccount._id.toString(),
        }),
        ...(options.terminalId && {
          updatedByTerminal: options.terminalId,
        }),
      },
      duration: Number((performance.now() - startTime).toFixed(3)),
    });

    if (sessionCreatedWithinService) {
      await session.commitTransaction();
      session.endSession();
    }

    return config;
  } catch (error) {
    if (sessionCreatedWithinService) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
}
