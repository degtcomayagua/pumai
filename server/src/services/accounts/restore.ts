import mongoose from "mongoose";
import AccountModel from "../../models/Account";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";
import retry from "async-retry";
import { performance } from "perf_hooks";

type RestoreAccountOptions = {
	session?: mongoose.ClientSession;
	traceId?: string;
	adminAccount?: IAccount;
};

export class AccountNotFoundError extends Error {
	retryable = false;
	constructor(message: string) {
		super(message);
		this.name = "AccountNotFoundError";
	}
}

export async function restoreAccount(
	accountId: string,
	options: RestoreAccountOptions = {},
): Promise<IAccount> {
	const startTime = performance.now();
	const adminAccount = options.adminAccount ?? undefined;

	let session = options.session;
	let sessionCreatedWithinService = false;

	if (!session) {
		session = await mongoose.startSession();
		session.startTransaction();
		sessionCreatedWithinService = true;
	}

	try {
		const account = await AccountModel.findOne({
			_id: accountId,
			"metadata.deleted": { $ne: false },
		}).session(session);

		if (!account) {
			throw new AccountNotFoundError("Account not found or already restored");
		}

		const now = new Date();

		const updateHistoryEntry = {
			updatedAt: now,
			updatedBy: adminAccount?._id ?? undefined,
			changes: {
				"metadata.deleted": false,
				"metadata.deletedAt": undefined,
				"metadata.deletedByTerminal": undefined,
				"metadata.deletedBy": undefined,
			},
		};

		account.metadata.deleted = false;
		account.metadata.deletedAt = undefined;

		account.metadata.updatedAt = now;
		(account.metadata.updateHistory ?? []).push(updateHistoryEntry);

		account.metadata.deletedBy = undefined;
		if (adminAccount) {
			account.metadata.updatedBy = adminAccount._id;
		}

		await account.save({ session });

		const durationMs = Number((performance.now() - startTime).toFixed(3));

		LoggingService.log({
			source: "services:accounts:restore",
			level: "important",
			message: "Account restored",
			traceId: options.traceId,
			details: {
				accountId: account._id.toString(),
				name: account.profile.name,
			},
			duration: durationMs,
			_references: {
				accountId: "Account",
			},
			metadata: {
				createdAt: now,
				createdBy: adminAccount ? adminAccount._id : undefined,
				documentVersion: account.metadata.documentVersion || 1,
			},
		});

		if (sessionCreatedWithinService) {
			await session.commitTransaction();
			session.endSession();
		}

		return account;
	} catch (err) {
		if (sessionCreatedWithinService) {
			await session.abortTransaction();
			session.endSession();
		}
		throw err;
	}
}

export async function restoreAccountWithRetry(
	accountId: string,
	options: RestoreAccountOptions = {},
): Promise<IAccount> {
	return retry(
		async (bail, attempt) => {
			const startTime = performance.now();
			try {
				return await restoreAccount(accountId, options);
			} catch (error: any) {
				if (error instanceof AccountNotFoundError) {
					bail(error);
				}

				LoggingService.log({
					source: "services:accounts:restore:retry",
					level: "warning",
					traceId: options.traceId,
					duration: Number((performance.now() - startTime).toFixed(3)),
					message: `Retryable error during account restore (attempt ${attempt})`,
					details: { error: error.message, stack: error.stack },
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
