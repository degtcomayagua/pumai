import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  AccountRole,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "@prisma/client";
type MetadataUpdateHistoryCreateWithoutMetadataInput =
  Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput;

import LoggingService from "../../services/logging.js";

type RestoreAccountRoleOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class AccountRoleNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleNotFoundError";
  }
}

export async function restoreAccountRole(
  roleId: string,
  options: RestoreAccountRoleOptions = {},
): Promise<AccountRole> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch role with metadata + updateHistory
  const existingRole = await prismaClient.accountRole.findUnique({
    where: {
      id: roleId,
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

  if (!existingRole) {
    throw new AccountRoleNotFoundError(
      "Account role not found or already restored",
    );
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

  let updatePayload: Prisma.AccountRoleUpdateInput;

  // Update the metadata
  if (existingRole.metadata) {
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

  // perform update: set metadata.deleted = true and append updateHistory
  const deleted = await prismaClient.accountRole.update({
    where: { id: roleId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:account-roles:restore",
    level: "important",
    message: "Account role restored",
    traceId: options.traceId,
    details: {
      accountRoleId: String(deleted.id),
      name: deleted.name,
      ...(userAccountId !== null ? { restoredBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      accountRoleId: "AccountRole",
      ...(userAccountId !== null ? { restoredBy: "Account" } : {}),
    },
  });

  return deleted;
}

export async function restoreAccountRoleWithRetry(
  roleId: string,
  options: RestoreAccountRoleOptions = {},
): Promise<AccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreAccountRole(roleId, options);
      } catch (error: any) {
        if (error instanceof AccountRoleNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role restoration (attempt ${attempt})`,
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
