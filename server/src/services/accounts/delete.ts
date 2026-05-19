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

type DeleteAccountRoleOptions = {
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

export async function deleteAccount(
  accountToDeleteId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<Account> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch role with metadata + updateHistory
  const existingAccount = await prismaClient.account.findUnique({
    where: {
      id: accountToDeleteId,
      metadata: {
        is: {
          deleted: false,
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
    throw new AccountNotFoundError("Account not found or already deleted");
  }

  const now = new Date();

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": true,
      "metadata.deletedAt": now.toISOString(),
      ...(userAccountId && { "metadata.deletedById": userAccountId }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: true,
    deletedAt: now,
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
          deleted: true,
          deletedAt: now,
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

  // Change the email to prevent conflicts with unique constraint and to indicate that the account is deleted
  updatePayload.email = `deleted_${existingAccount.id}_${now.getTime()}@example.com`;

  // perform update: set metadata.deleted = true and append updateHistory
  const deleted = await prismaClient.account.update({
    where: { id: accountToDeleteId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:accounts:delete",
    level: "important",
    message: "Account deleted",
    traceId: options.traceId,
    details: {
      accountId: String(deleted.id),
      name: deleted.name,
      email: deleted.email,
      ...(userAccountId !== null ? { deletedBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      accountId: "Account",
    },
  });

  return deleted;
}

export async function deleteAccountWithRetry(
  accountId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteAccount(accountId, options);
      } catch (error: any) {
        if (error instanceof AccountNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:accounts:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account deletion (attempt ${attempt})`,
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
