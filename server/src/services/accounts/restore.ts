import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "@prisma/client";
type MetadataUpdateHistoryCreateWithoutMetadataInput =
  Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput;

import LoggingService from "../../services/logging.js";

type RestoreAccountOptions = {
  traceId?: string;
  userAccount?: Account;
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
  const userAccountId = options.userAccount?.id;

  // fetch account with metadata + updateHistory
  const existingAccount = await prismaClient.account.findUnique({
    where: {
      id: accountId,
      metadata: {
        is: {
          deleted: true,
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

  if (!existingAccount) {
    throw new AccountNotFoundError("Account not found or already restored");
  }

  const now = new Date();

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": false,
      "metadata.deletedAt": null,
      ...(userAccountId && { "metadata.deletedById": null }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: false,
    deletedAt: null,
    deletedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  let updatePayload: Prisma.AccountUpdateInput;

  // Update the metadata
  if (existingAccount.metadata) {
    updatePayload = { metadata: { update: metadataUpdatePayload } };
  } else {
    // In the unlikely case that metadata doesn't exist, create it and mark as deleted
    updatePayload = {
      metadata: {
        create: {
          documentVersion: 1,
          createdAt: now,
          createdById: userAccountId ?? null,
          updatedAt: now,
          updatedById: userAccountId ?? null,
          deleted: false,
          deletedAt: null,
          deletedById: userAccountId ?? null,
          status: MetadataStatus.active,
          source: MetadataSource.manual,
          notes: "",
          tags: "",
          updateHistory: { create: historyEntry },
        },
      },
    };
  }

  // perform update: set metadata.deleted = false and append updateHistory
  const restored = await prismaClient.account.update({
    where: { id: accountId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:accounts:restore",
    level: "important",
    message: "Account restored",
    traceId: options.traceId,
    details: {
      accountId: String(restored.id),
      name: restored.name,
      ...(userAccountId !== null ? { restoredBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      accountId: "Account",
      ...(userAccountId !== null ? { restoredBy: "Account" } : {}),
    },
  });

  return restored;
}

export async function restoreAccountWithRetry(
  roleId: string,
  options: RestoreAccountOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreAccount(roleId, options);
      } catch (error: any) {
        if (error instanceof AccountNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:accounts:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account restoration (attempt ${attempt})`,
          details: {
            error: error?.message,
            stack: error?.stack,
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
