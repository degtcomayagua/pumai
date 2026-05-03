import bcrypt from "bcrypt";
import retry from "async-retry";
import { performance } from "perf_hooks";
import {
  Prisma,
  MetadataSource,
  MetadataStatus,
  Account,
  MetadataUpdateHistory,
} from "../../../../generated/prisma/client.js";
import {
  AccountUpdateInput,
  MetadataUpdateHistoryCreateWithoutMetadataInput,
} from "../../../../generated/prisma/models.js";

import prismaClient from "../../config/prisma.js";
import LoggingService from "../../services/logging.js";

type UpdateAccountOptions = {
  traceId?: string;
  userAccount?: Account;
};

interface UpdateAccountParameters {
  accountId: string;
  email?: string;
  name?: string;
  roleId?: string;
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

export async function updateAccount(
  params: UpdateAccountParameters,
  options: UpdateAccountOptions = {},
): Promise<Account> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  const existing = await prismaClient.account.findUnique({
    where: {
      id: params.accountId,
      metadata: {
        is: {
          deleted: false,
        },
      },
    },
    include: { metadata: { include: { updateHistory: true } } },
  });

  if (!existing) throw new AccountNotFoundError();

  const now = new Date();
  const changes: MetadataUpdateHistory["changes"] = {};
  const updatePayload: AccountUpdateInput = {};

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
    updatePayload.role = { connect: { id: params.roleId } };
    changes["roleId"] = params.roleId;
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

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes,
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  if (existing.metadata) {
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
        accountId: updated.id,
        updatedBy: userAccountId != null ? userAccountId : undefined,
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

export async function updateAccountWithRetry(
  params: UpdateAccountParameters,
  options: UpdateAccountOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateAccount(params, options);
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
