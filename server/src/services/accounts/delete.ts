import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma";
import LoggingService from "../../services/logging";

import { Account } from "../../../../generated/prisma/client";

type DeleteUserOptions = {
  traceId?: string;
  userAccount?: Account;
  allowDeleteSelf?: boolean;
};

export class AccountNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

export class CannotDeleteSelfError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "CannotDeleteSelfError";
  }
}

export async function deleteUserAccount(
  accountId: string,
  options: DeleteUserOptions = {},
): Promise<Account> {
  const startTime = performance.now();
  const userAccount = options.userAccount;
  const deletedById = userAccount ? userAccount.id : null;

  // fetch account with metadata + updateHistory so we can reference current state
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

  if (!account) {
    throw new AccountNotFoundError("not-found");
  }

  // check self-delete guard
  if (
    deletedById !== null &&
    accountId === deletedById &&
    !options.allowDeleteSelf
  ) {
    throw new CannotDeleteSelfError("cannot-delete-self");
  }

  const now = new Date();

  // build the updateHistory entry (JSON-compatible)
  const updateHistoryEntry = {
    updatedAt: now,
    updatedById: deletedById,
    changes: {
      "metadata.deleted": true,
      "metadata.deletedAt": now,
      "metadata.deletedById": deletedById,
    },
    accountId: deletedById,
  };

  // compute a safe "deleted" email
  const deletedEmail = `${now.getTime()}-${Math.random().toString(36).slice(2, 15)}@deleted.com`;

  // Perform the update: set emailValue and update related metadata (soft-delete + create updateHistory)
  const updatedAccount = await prismaClient.account.update({
    where: { id: accountId },
    data: {
      emailValue: deletedEmail,
      // update metadata relation (metadataId exists or not — use update if exists, otherwise create)
      metadata: account.metadata
        ? {
          update: {
            deleted: true,
            deletedAt: now,
            deletedById: deletedById,
            updatedAt: now,
            updatedById: deletedById,
            updateHistory: {
              create: {
                updatedAt: now,
                updatedById: deletedById,
                changes: updateHistoryEntry.changes,
              },
            },
          },
        }
        : {
          // If account had no metadata, create one and append the history
          create: {
            documentVersion: 1,
            createdAt: now,
            createdById: deletedById,
            updatedAt: now,
            updatedById: deletedById,
            deleted: true,
            deletedAt: now,
            deletedById: deletedById,
            status: "active",
            source: "manual",
            notes: "",
            tags: "",
            updateHistory: {
              create: {
                updatedAt: now,
                updatedById: deletedById,
                changes: updateHistoryEntry.changes,
                accountId: deletedById,
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

  // Logging
  LoggingService.log({
    source: "services:accounts:delete",
    level: "important",
    message: "Admin deleted a user account",
    traceId: options.traceId,
    details: {
      accountId: String(updatedAccount.id),
      deletedBy: deletedById !== null ? String(deletedById) : undefined,
      email: updatedAccount.email,
      name: updatedAccount.name,
    },
    duration: durationMs,
    _references: {
      accountId: "Account",
      deletedBy: deletedById !== null ? "Account" : undefined,
    },
  });

  return updatedAccount;
}

export async function deleteUserAccountWithRetry(
  accountId: string,
  options: DeleteUserOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteUserAccount(accountId, options);
      } catch (error: any) {
        if (
          error instanceof AccountNotFoundError ||
          error instanceof CannotDeleteSelfError
        ) {
          bail(error);
        }

        LoggingService.log({
          source: "services:accounts:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account deletion (attempt ${attempt})`,
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
