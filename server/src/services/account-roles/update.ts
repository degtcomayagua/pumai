import { performance } from "perf_hooks";
import retry from "async-retry";

import {
  Account,
  AccountRole,
  MetadataSource,
  MetadataStatus,
  MetadataUpdateHistory,
  Prisma,
} from "@prisma/client";
import prismaClient from "../../config/prisma.js";

import LoggingService from "../../services/logging.js";

type AccountRoleUpdateInput = Prisma.AccountRoleUpdateInput;
type MetadataUpdateHistoryCreateWithoutMetadataInput =
  Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput;
type MetadataUpdateInput = Prisma.MetadataUpdateInput;

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

export class AccountRoleNotFoundError extends Error {
  retryable = false;
  /** @param message Error message */
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleNotFoundError";
  }
}

export class AccountRoleExistsError extends Error {
  retryable = false;
  /** @param message Error message */
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleExistsError";
  }
}

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
  const updatePayload: Prisma.AccountRoleUpdateInput = {};

  // Doing it like this because otherwise we lose type safety
  if (name !== undefined) {
    changes.name = name;
    updatePayload.name = name;
  }
  if (description !== undefined) {
    changes.description = description;
    updatePayload.description = description;
  }
  if (level !== undefined) {
    changes.level = level;
    updatePayload.level = level;
  }
  if (permissions !== undefined) {
    changes.permissions = permissions;
    updatePayload.permissions = permissions.join(",");
  }
  if (requiresTwoFactor !== undefined) {
    changes.requiresTwoFactor = requiresTwoFactor;
    updatePayload.requiresTwoFactor = requiresTwoFactor;
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
