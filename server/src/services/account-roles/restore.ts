import { performance } from "perf_hooks";
import retry from "async-retry";

import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";

import {
  Account,
  AccountRole,
} from "../../../../generated/prisma/client";

type RestoreAccountRoleOptions = {
  traceId?: string;
  userAccount?: Account;
};

/**
 * AccountRoleNotFoundError indicates the requested account role was not found or not eligible for restore.
 */
export class AccountRoleNotFoundError extends Error {
  retryable = false;
  /** @param message Error message */
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleNotFoundError";
  }
}

/**
 * Restore a previously-deleted account role by clearing metadata.deleted and appending an updateHistory entry.
 * @param roleId Role id (string)
 * @param options traceId and userAccount
 * @returns restored IAccountRole
 */
export async function restoreAccountRole(
  roleId: string,
  options: RestoreAccountRoleOptions = {},
): Promise<AccountRole> {
  const startTime = performance.now();
  const userAccount = options.userAccount;
  const now = new Date();

  // Find the role where metadata.deleted != false (preserve original behavior)
  const existingRole = await prismaClient.accountRole.findFirst({
    where: {
      id: roleId,
      metadata: {
        // metadata.deleted !== false
        deleted: { not: false },
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

  const accountId = userAccount?.id;

  // Build change record using the original external-facing keys
  const changes = {
    "metadata.deleted": false,
    "metadata.deletedAt": null,
    "metadata.deletedByTerminal": null,
    "metadata.deletedBy": null,
  };

  try {
    // Update metadata first and append updateHistory entry
    await prismaClient.metadata.update({
      where: { id: existingRole.metadataId! },
      data: {
        deleted: false,
        deletedAt: null,
        // deletedById cleared
        deletedById: null,
        updatedAt: now,
        updatedById: accountId,
        updateHistory: {
          create: {
            updatedAt: now,
            updatedById: accountId,
            changes,
            // If the update history model expects an accountId or similar, Prisma will map relations.
            // No explicit accountId provided here since it may not exist on role update history.
          },
        },
      },
    });

    // Re-fetch the role with metadata and updateHistory for return value
    const updatedRole = await prismaClient.accountRole.findUnique({
      where: { id: roleId },
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
      source: "services:account-roles:restore",
      level: "important",
      message: "Account role restored",
      traceId: options.traceId,
      details: {
        accountRoleId: String(roleId),
        name: updatedRole?.name,
      },
      duration: durationMs,
      _references: {
        accountRoleId: "AccountRole",
      },
    });

    if (!updatedRole) {
      // This should be unlikely; treat as not found to match domain semantics
      throw new AccountRoleNotFoundError(
        "Account role not found after restore",
      );
    }

    return updatedRole;
  } catch (err: any) {
    // Re-throw after (no transaction-management here per migration rules)
    throw err;
  }
}

/**

* Wrapper that retries restoreAccountRole on retryable errors, bails on not-found.
* @param roleId Role id
* @param options Restore options
* @returns restored IAccountRole
  */
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
          // Non-retryable: bail out of retry loop
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role restore (attempt ${attempt})`,
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
