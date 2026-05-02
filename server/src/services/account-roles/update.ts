import { performance } from "perf_hooks";
import retry from "async-retry";

import {
  Account,
  AccountRole,
  MetadataSource,
  MetadataStatus,
  MetadataUpdateHistory,
  Prisma,
} from "../../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";

import {
  AccountRoleUpdateInput,
  MetadataUpdateHistoryCreateWithoutMetadataInput,
  MetadataUpdateInput,
} from "../../../../generated/prisma/models";

type UpdateAccountRoleParameters = {
  roleId: string;
  name?: string;
  description?: string;
  level?: number;
  permissions?: string[];
  requiresTwoFactor?: boolean;
};

type UpdateAccountRoleOptions = {
  traceId?: string;
  userAccount?: Account;
};

/**
 * Indicates the requested account role was not found or is deleted.
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
 * Indicates a unique constraint collision when updating an account role (e.g., name already in use).
 */
export class AccountRoleExistsError extends Error {
  retryable = false;
  /** @param message Error message */
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleExistsError";
  }
}

/**
 * Update an account role and append a metadata updateHistory entry.
 * @param params Update parameters
 * @param options traceId and adminAccount
 * @returns updated AccountRole
 */
export async function updateAccountRole(
  params: UpdateAccountRoleParameters,
  options: UpdateAccountRoleOptions,
): Promise<AccountRole> {
  const startTime = performance.now();
  const now = new Date();

  const { roleId, name, description, level, permissions, requiresTwoFactor } =
    params;
  const userAccountId = options.userAccount?.id;

  // Fetch existing role ensuring it's not deleted (metadata.deleted !== true)
  const existingRole = await prismaClient.accountRole.findUnique({
    where: {
      id: roleId,
      metadata: {
        is: {
          deleted: false,
        },
      },
    },
    include: {
      metadata: { include: { updateHistory: true } },
    },
  });

  if (!existingRole) {
    throw new AccountRoleNotFoundError("Account role not found or deleted");
  }

  // Collect changes using external-facing keys
  const changes: MetadataUpdateHistory["changes"] = {};
  const updateData: Prisma.AccountRoleUpdateInput = {};

  // Doing it like this because otherwise we lose type safety
  if (name !== undefined) {
    changes.name = name;
    updateData.name = name;
  }
  if (description !== undefined) {
    changes.description = description;
    updateData.description = description;
  }
  if (level !== undefined) {
    changes.level = level;
    updateData.level = level;
  }
  if (permissions !== undefined) {
    changes.permissions = permissions;
    updateData.permissions = permissions.join(",");
  }
  if (requiresTwoFactor !== undefined) {
    changes.requiresTwoFactor = requiresTwoFactor;
    updateData.requiresTwoFactor = requiresTwoFactor;
  }

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes,
  };

  const metadataUpdatePayload: MetadataUpdateInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: {
      create: historyEntry,
    },
  };

  const updatePayload: AccountRoleUpdateInput = {};

  if (existingRole.metadata) {
    updatePayload.metadata = { update: metadataUpdatePayload };
  } else {
    updatePayload.metadata = {
      create: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccountId,
        updatedAt: now,
        updatedById: userAccountId,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
        updateHistory: { create: historyEntry },
      },
    };
  }

  try {
    const updated = await prismaClient.accountRole.update({
      where: { id: params.roleId },
      data: updatePayload,
      include: { metadata: { include: { updateHistory: true } } },
    });

    LoggingService.log({
      source: "services:account-roles:update",
      level: "important",
      message: "Admin updated account role",
      traceId: options.traceId,
      duration: Number((performance.now() - startTime).toFixed(3)),
      details: {
        roleId: updated.id,
        updatedBy: userAccountId != null ? userAccountId : undefined,
      },
      _references: {
        roleId: "AccountRole",
        updatedBy: "Account",
      },
    });

    return updated;
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      (err.meta as any)?.target?.includes?.("name")
    ) {
      throw new AccountRoleExistsError(
        "An account role with this name already exists",
      );
    }
    throw err;
  }
}

/**
 * Wrapper that retries updateAccountRole on retryable errors, bails on not-found.
 * @param params Update parameters
 * @param options Update options
 * @returns updated AccountRole
 */
export async function updateAccountRoleWithRetry(
  params: UpdateAccountRoleParameters,
  options: UpdateAccountRoleOptions,
): Promise<AccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateAccountRole(params, options);
      } catch (error: any) {
        if (error instanceof AccountRoleNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role update (attempt ${attempt})`,
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
