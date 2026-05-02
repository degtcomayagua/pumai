import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma";
import {
  Account,
  AccountRole,
  MetadataSource,
  MetadataStatus,
} from "../../../../generated/prisma/client";

import LoggingService from "../../services/logging";

type DeleteAccountRoleOptions = {
  traceId?: string;
  adminAccount?: Account;
};

export class AccountRoleNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleNotFoundError";
  }
}

export async function deleteAccountRole(
  roleId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<AccountRole> {
  const startTime = performance.now();
  const accountId = options.adminAccount?.id;

  // fetch role with metadata + updateHistory
  const existingRole = await prismaClient.accountRole.findUnique({
    where: { id: roleId },
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
      "Account role not found or already deleted",
    );
  }

  // if metadata.deleted === true then treat as not found/already deleted
  if (existingRole.metadata?.deleted === true) {
    throw new AccountRoleNotFoundError(
      "Account role not found or already deleted",
    );
  }

  const now = new Date();

  const updateHistoryChanges = {
    "metadata.deleted": true,
    "metadata.deletedAt": now,
    ...(accountId !== null ? { "metadata.deletedById": accountId } : {}),
  };

  // perform update: set metadata.deleted = true and append updateHistory
  const updatedRole = await prismaClient.accountRole.update({
    where: { id: roleId },
    data: {
      metadata: existingRole.metadata
        ? {
          update: {
            deleted: true,
            deletedAt: now,
            deletedById: accountId,
            updatedAt: now,
            updatedById: accountId,
            updateHistory: {
              create: {
                updatedAt: now,
                updatedById: accountId,
                changes: updateHistoryChanges,
              },
            },
          },
        }
        : {
          // if no metadata exists, create one and mark deleted
          create: {
            documentVersion: 1,
            createdAt: now,
            createdById: accountId,
            updatedAt: now,
            updatedById: accountId,
            deleted: true,
            deletedAt: now,
            deletedById: accountId,
            status: MetadataStatus.active,
            source: MetadataSource.manual,
            notes: "",
            tags: "",
            updateHistory: {
              create: {
                updatedAt: now,
                updatedById: accountId,
                changes: updateHistoryChanges,
                accountId: accountId,
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
    source: "services:account-roles:delete",
    level: "important",
    message: "Account role deleted",
    traceId: options.traceId,
    details: {
      accountRoleId: String(updatedRole.id),
      name: updatedRole.name,
      ...(accountId !== null ? { deletedBy: String(accountId) } : {}),
    },
    duration: durationMs,
    _references: {
      accountRoleId: "AccountRole",
    },
  });

  return updatedRole;
}

export async function deleteAccountRoleWithRetry(
  roleId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<AccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteAccountRole(roleId, options);
      } catch (error: any) {
        if (error instanceof AccountRoleNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role deletion (attempt ${attempt})`,
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
