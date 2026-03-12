// create.ts
import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import ConfigModel from "../../models/Config";
import { IConfig } from "../../../../shared/models/config";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

type CreateConfigOptions = {
	session?: mongoose.ClientSession;
	traceId?: string;
};

type CreateConfigParameters = Omit<IConfig, "metadata"> & {
	createdBy: IAccount;
};

export class ConfigAlreadyExistsError extends Error {
	retryable = false;
	constructor() {
		super("config-already-exists");
		this.name = "ConfigAlreadyExistsError";
	}
}

export async function createConfig(
	params: CreateConfigParameters,
	options: CreateConfigOptions = {},
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
		const existing = await ConfigModel.findOne().session(session);
		if (existing) {
			throw new ConfigAlreadyExistsError();
		}

		const now = new Date();
		const config = new ConfigModel({
			...params,
			metadata: {
				createdAt: now,
				createdBy: params.createdBy._id,
				updatedAt: now,
				updatedBy: params.createdBy._id,
			},
		});

		await config.save({ session });

		LoggingService.log({
			source: "services:config:create",
			level: "important",
			message: "Config created successfully",
			traceId: options.traceId,
			details: {
				configId: config._id.toString(),
				createdBy: params.createdBy._id.toString(),
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

export async function createConfigWithRetry(
	params: CreateConfigParameters,
	options: CreateConfigOptions = {},
): Promise<IConfig> {
	return retry(
		async (bail, attempt) => {
			const startTime = performance.now();
			try {
				return await createConfig(params, options);
			} catch (error: any) {
				if (error instanceof ConfigAlreadyExistsError) {
					bail(error);
				}

				LoggingService.log({
					source: "services:config:create:retry",
					level: "warning",
					traceId: options.traceId,
					duration: Number((performance.now() - startTime).toFixed(3)),
					message: `Retryable error during config creation (attempt ${attempt})`,
					details: {
						error: error.message,
						stack: error.stack,
					},
				});

				throw error;
			}
		},
		{
			retries: 3,
			minTimeout: 1000,
			maxTimeout: 5000,
			factor: 2,
		},
	);
}
