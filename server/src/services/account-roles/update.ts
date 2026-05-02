import { performance } from "perf_hooks";
import retry from "async-retry";

import { Prisma } from "../../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";

import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

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
  userAccount?: IAccount;
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
 * @returns updated IAccountRole
 */
export async function updateAccountRole(
  params: UpdateAccountRoleParameters,
  options: UpdateAccountRoleOptions,
): Promise<IAccountRole> {
  const startTime = performance.now();
  const now = new Date();

  const { roleId, name, description, level, permissions, requiresTwoFactor } =
    params;
  const userId = options.userAccount?.id;

  // Fetch existing role ensuring it's not deleted (metadata.deleted !== true)
  const existingRole = await prismaClient.accountRole.findUnique({
    where: { id: roleId },
    include: {
      metadata: { include: { updateHistory: true } },
    },
  });

  if (!existingRole || existingRole.metadata?.deleted === true) {
    throw new AccountRoleNotFoundError("Account role not found or deleted");
  }

  // Collect changes using external-facing keys
  const changes: Record<string, any> = {};
  if (name !== undefined) changes.name = name;
  if (description !== undefined) changes.description = description;
  if (level !== undefined) changes.level = level;
  if (permissions !== undefined) changes.permissions = permissions;
  if (requiresTwoFactor !== undefined)
    changes.requiresTwoFactor = requiresTwoFactor;

  // Prepare accountRole update data
  const roleUpdateData: Record<string, any> = {};
  if (name !== undefined) roleUpdateData.name = name;
  if (description !== undefined) roleUpdateData.description = description;
  if (level !== undefined) roleUpdateData.level = level;
  if (permissions !== undefined)
    // Prisma JSON handling; cast as any when necessary
    roleUpdateData.permissions = permissions as any;
  if (requiresTwoFactor !== undefined)
    roleUpdateData.requiresTwoFactor = requiresTwoFactor;

  try {
    // Perform metadata update (append history) and accountRole update in a single transaction
    const [updatedMetadata, updatedRole] = await prismaClient.$transaction([
      prismaClient.metadata.update({
        where: { id: existingRole.metadataId! },
        data: {
          updatedAt: now,
          updatedById: userId,
          updateHistory: {
            create: {
              updatedAt: now,
              updatedById: userId,
              changes,
            },
          },
        },
      }),
      prismaClient.accountRole.update({
        where: { id: roleId },
        data: roleUpdateData,
        include: {
          metadata: { include: { updateHistory: true } },
        },
      }),
    ]);

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:account-roles:update",
      level: "important",
      message: "Account role updated",
      traceId: options.traceId,
      details: {
        roleId: String(roleId),
        changes,
      },
      duration: durationMs,
      _references: {
        roleId: "AccountRole",
      },
    });

    return updatedRole as unknown as IAccountRole;
  } catch (err: any) {
    // Map Prisma unique constraint errors to domain errors
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = (err.meta as any)?.target;
      // If unique constraint on name
      if (
        Array.isArray(target)
          ? target.includes("name")
          : String(target).includes("name")
      ) {
        throw new AccountRoleExistsError("Account role name already in use");
      }
    }

    throw err;
  }
}

/**
 * Wrapper that retries updateAccountRole on retryable errors, bails on not-found.
 * @param params Update parameters
 * @param options Update options
 * @returns updated IAccountRole
 */
export async function updateAccountRoleWithRetry(
  params: UpdateAccountRoleParameters,
  options: UpdateAccountRoleOptions,
): Promise<IAccountRole> {
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
