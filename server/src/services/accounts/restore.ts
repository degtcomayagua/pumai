import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma";
import LoggingService from "../../services/logging";

import { Account } from "../../../../generated/prisma/client";

type RestoreAccountOptions = {
  traceId?: string;
  adminAccount?: Account;
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
): Promise<Account> {
  const startTime = performance.now();
  const restoredById = options.adminAccount ? options.adminAccount.id : null;

  // load the account with metadata so we can confirm it's deleted and append history
  const account = await prismaClient.account.findUnique({
    where: { id: accountId },
    include: {
      metadata: {
        include: {
          updateHistory: true,
        },
      },
    },
  });

  if (!account || !account.metadata || account.metadata.deleted !== true) {
    throw new AccountNotFoundError("Account not found or already restored");
  }

  const now = new Date();

  const updateHistoryChanges = {
    "metadata.deleted": false,
    "metadata.deletedAt": null,
    "metadata.deletedById": null,
  };

  // Perform the update: unset deleted flags and push a metadata updateHistory entry
  const updated = await prismaClient.account.update({
    where: { id: accountId },
    data: {
      metadata: {
        update: {
          deleted: false,
          deletedAt: null,
          deletedById: null,
          updatedAt: now,
          updatedById: restoredById,
          updateHistory: {
            create: {
              updatedAt: now,
              updatedById: restoredById,
              changes: updateHistoryChanges,
            },
          },
        },
      },
    },
    include: {
      metadata: {
        include: {
          updateHistory: true,
        },
      },
    },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:accounts:restore",
    level: "important",
    message: "Account restored",
    traceId: options.traceId,
    details: {
      accountId: String(updated.id),
      restoredBy: restoredById !== null ? String(restoredById) : undefined,
      name: updated.name,
    },
    duration: durationMs,
    _references: {
      accountId: "Account",
      restoredBy: restoredById !== null ? "Account" : undefined,
    },
  });

  return updated;
}

export async function restoreAccountWithRetry(
  accountId: string,
  options: RestoreAccountOptions = {},
): Promise<Account> {
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
          details: { error: error?.message, stack: error?.stack },
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
