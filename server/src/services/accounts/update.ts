import bcrypt from "bcrypt";
import retry from "async-retry";
import { performance } from "perf_hooks";
import {
  Prisma,
  MetadataSource,
  MetadataStatus,
  Account,
} from "../../../../generated/prisma/client";

import prismaClient from "../../config/prisma";
import LoggingService from "../../services/logging";

type UpdateUserOptions = {
  traceId?: string;
  adminAccount?: Account;
};

interface UpdateUserParameters {
  accountId: string;
  email?: string;
  name?: string;
  roleId?: number;
  campus?: Account["campus"];
  password?: string;
}

export class EmailInUseError extends Error {
  retryable = false;
  constructor() {
    super("email-in-use");
    this.name = "EmailInUseError";
  }
}

export class AccountNotFoundError extends Error {
  retryable = false;
  constructor() {
    super("not-found");
    this.name = "AccountNotFoundError";
  }
}

export async function updateUserAccount(
  params: UpdateUserParameters,
  options: UpdateUserOptions = {},
): Promise<Account> {
  const startTime = performance.now();
  const adminAccountId = options.adminAccount?.id;

  const existing = await prismaClient.account.findUnique({
    where: { id: params.accountId },
    include: { metadata: { include: { updateHistory: true } } },
  });

  if (!existing) throw new AccountNotFoundError();

  const now = new Date();
  const changes: Record<string, any> = {};
  const updatePayload: any = {};

  if (typeof params.email !== "undefined") {
    const emailLower = params.email.toLowerCase();
    const conflict = await prismaClient.account.findFirst({
      where: { email: emailLower, NOT: { id: params.accountId } },
    });
    if (conflict) throw new EmailInUseError();
    updatePayload.email = emailLower;
    changes["email"] = emailLower;
  }

  if (typeof params.name !== "undefined") {
    updatePayload.name = params.name;
    changes["name"] = params.name;
  }

  if (typeof params.roleId !== "undefined") {
    const roleIdNum = params.roleId === null ? null : Number(params.roleId);
    if (roleIdNum !== null && Number.isNaN(roleIdNum)) {
      throw new Error("Invalid role id");
    }
    updatePayload.role = { connect: { id: roleIdNum } };
    changes["roleId"] = roleIdNum;
  }

  if (typeof params.campus !== "undefined") {
    updatePayload.campus = params.campus;
    changes["campus"] = params.campus;
  }

  if (typeof params.password !== "undefined") {
    const hashed = await bcrypt.hash(params.password, 10);
    updatePayload.password = hashed;
    changes["preferences.security.password"] = "[REDACTED]";
  }

  const historyEntry = {
    updatedAt: now,
    updatedById: adminAccountId,
    changes,
    accountId: adminAccountId,
  };

  const metadataUpdatePayload: any = {
    updatedAt: now,
    updatedById: adminAccountId ?? null,
    updateHistory: { create: historyEntry },
  };

  if (existing.metadata) {
    updatePayload.metadata = { update: metadataUpdatePayload };
  } else {
    updatePayload.metadata = {
      create: {
        documentVersion: 1,
        createdAt: now,
        createdById: adminAccountId,
        updatedAt: now,
        updatedById: adminAccountId,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: [],
        updateHistory: { create: historyEntry },
      },
    };
  }

  try {
    const updated = await prismaClient.account.update({
      where: { id: params.accountId },
      data: updatePayload,
      include: { metadata: { include: { updateHistory: true } } },
    });

    LoggingService.log({
      source: "services:accounts:update",
      level: "important",
      message: "Admin updated user account",
      traceId: options.traceId,
      duration: Number((performance.now() - startTime).toFixed(3)),
      details: {
        accountId: String(updated.id),
        updatedBy: adminAccountId != null ? String(adminAccountId) : undefined,
      },
      _references: {
        accountId: "Account",
        updatedBy: "Account",
      },
    });

    return updated;
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      (err.meta as any)?.target?.includes?.("emailValue")
    ) {
      throw new EmailInUseError();
    }
    throw err;
  }
}

export async function updateUserAccountWithRetry(
  params: UpdateUserParameters,
  options: UpdateUserOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateUserAccount(params, options);
      } catch (err: any) {
        if (
          err instanceof AccountNotFoundError ||
          err instanceof EmailInUseError
        ) {
          bail(err);
        }

        LoggingService.log({
          source: "services:accounts:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account update (attempt ${attempt})`,
          details: {
            error: err?.message,
            stack: err?.stack,
          },
        });

        throw err;
      }
    },
    { retries: 3, minTimeout: 1000, maxTimeout: 5000, factor: 2 },
  );
}