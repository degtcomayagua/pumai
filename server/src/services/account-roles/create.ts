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

import LoggingService from "../../services/logging.js";

type CreateAccountRoleParameters = {
  name: string;
  description?: string;
  level: number;
  isSystemRole?: boolean;
  requiresTwoFactor?: boolean;
  permissions?: string[];
};

type CreateAccountRoleOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class AccountRoleExistsError extends Error {
  retryable = false;
  constructor(message = "role-name-in-use") {
    super(message);
    this.name = "AccountRoleExistsError";
  }
}

export async function createAccountRole(
  params: CreateAccountRoleParameters,
  options: CreateAccountRoleOptions = {},
): Promise<AccountRole> {
  const startTime = performance.now();

  const {
    name,
    description = "",
    level,
    isSystemRole = false,
    requiresTwoFactor = false,
    permissions = [],
  } = params;

  const now = new Date();
  const userAccount = options.userAccount;

  try {
    // create metadata first
    const metadata = await prismaClient.metadata.create({
      data: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccount?.id,
        updatedAt: now,
        updatedById: userAccount?.id,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
      },
    });

    // create account role referencing metadataId
    const role = await prismaClient.accountRole.create({
      data: {
        name,
        description,
        level,
        isSystemRole,
        requiresTwoFactor,
        permissions: permissions.join(","), // Prisma Json field
        metadataId: metadata.id,
      },
    });

    const duration = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:account-roles:create",
      level: "important",
      message: "Account role created successfully",
      traceId: options.traceId,
      duration,
      details: {
        accountRoleId: role.id,
        name,
      },
      _references: {
        accountRoleId: "AccountRole",
      },
    });

    return role;
  } catch (err: any) {
    // handle unique constraint on name (P2002)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if ((err.meta as any)?.target?.includes?.("name")) {
        throw new AccountRoleExistsError();
      }
    }
    throw err;
  }
}

export async function createAccountRoleWithRetry(
  params: CreateAccountRoleParameters,
  options: CreateAccountRoleOptions = {},
): Promise<AccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await createAccountRole(params, options);
      } catch (error: any) {
        // non-retryable
        if (error instanceof AccountRoleExistsError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role creation (attempt ${attempt})`,
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
