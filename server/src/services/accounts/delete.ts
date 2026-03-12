import mongoose from "mongoose";
import AccountsModel from "../../models/Account";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";
import retry from "async-retry";
import { performance } from "perf_hooks";

type DeleteUserOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
  allowDeleteSelf?: boolean; // Optional flag to allow self-deletion (Only applies if adminAccount and the accountId are the same)
};

export class AccountNotFoundError extends Error {
  retryable = false; // This error should not be retried
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

export class CannotDeleteSelfError extends Error {
  retryable = false; // This error should not be retried
  constructor(message: string) {
    super(message);
    this.name = "CannotDeleteSelfError";
  }
}

export async function deleteUserAccount(
  accountId: string,
  options: DeleteUserOptions = {},
): Promise<IAccount> {
  const startTime = performance.now();

  let session = options.session;
  let sessionCreatedWithinService = false;
  const adminAccount = options.adminAccount;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const account = await AccountsModel.findOne({
      _id: accountId,
      "metadata.deleted": { $ne: true },
    }).session(session);

    if (!account) {
      throw new AccountNotFoundError("not-found");
    }

    if (
      adminAccount &&
      accountId === adminAccount._id.toString() &&
      !options.allowDeleteSelf
    ) {
      throw new CannotDeleteSelfError("cannot-delete-self");
    }

    const now = new Date();

    const updateHistoryEntry = {
      updatedAt: now,
      updatedBy: adminAccount?._id,
      changes: {
        "metadata.deleted": true,
        "metadata.deletedAt": now,
        "metadata.deletedBy": adminAccount?._id,
      },
    };

    account.email.value = `${now.getTime()}-${Math.random().toString(36).slice(2, 15)}@deleted.com`;
    account.metadata.deleted = true;
    account.metadata.deletedAt = now;
    account.metadata.deletedBy = adminAccount?._id;
    account.metadata.updatedAt = now;
    account.metadata.updatedBy = adminAccount?._id;
    account.metadata.updateHistory = account.metadata.updateHistory || [];

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    await account.save({ session });

    LoggingService.log({
      source: "services:accounts:delete",
      level: "important",
      message: "Admin deleted a user account",
      traceId: options.traceId,
      details: {
        accountId: account._id.toString(),
        deletedBy: adminAccount?._id?.toString(),
        email: account.email.value,
        name: account.profile?.name,
      },
      duration: durationMs,
      _references: {
        accountId: "Account",
        deletedBy: adminAccount ? "Account" : undefined,
      },
      metadata: {
        createdAt: now,
        updateHistory: [updateHistoryEntry],
        createdBy: adminAccount?._id,
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

export async function deleteUserAccountWithRetry(
  accountId: string,
  options: DeleteUserOptions = {},
): Promise<IAccount> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteUserAccount(accountId, { ...options });
      } catch (error: any) {
        if (
          error instanceof AccountNotFoundError ||
          error instanceof CannotDeleteSelfError
        ) {
          // If the error is not retryable, bail out immediately
          bail(error);
        }

        LoggingService.log({
          source: "services:accounts:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account deletion (attempt ${attempt})`,
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
