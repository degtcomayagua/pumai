import bcrypt from "bcrypt";
import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma";
import {
  MetadataSource,
  MetadataStatus,
  Account,
  Prisma,
} from "../../../../generated/prisma/client";

import LoggingService from "../../services/logging";

type CreateUserOptions = {
  traceId?: string; // Unique identifier for tracing requests
  userAccount?: Account; // The account that is creating the user, if applicable
};

type CreateUserParameters = {
  name: string;
  email: string;
  campus: Account["campus"];
  password: string;
  roleId: string;
};

export class EmailInUseError extends Error {
  retryable = false; // This error should not be retried
  constructor(message: string) {
    super(message);
    this.name = "EmailInUseError";
  }
}

export async function createUserAccount(
  parameters: CreateUserParameters,
  options: CreateUserOptions = {},
): Promise<Account> {
  const startTime = performance.now();
  const { name, email, password, campus, roleId } = parameters;

  const now = new Date();
  const createdById = options.userAccount?.id;

  try {
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    const metadata = await prismaClient.metadata.create({
      data: {
        documentVersion: 1,
        createdAt: now,
        createdById: createdById ?? null,
        updatedAt: now,
        updatedById: createdById ?? null,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
      },
    });

    const account = await prismaClient.account.create({
      data: {
        name: name,
        lastLogin: now,
        roleId: roleId,
        status: "active",
        campus,
        email: email.toLowerCase(),
        emailLastChanged: now,
        lastPasswordChange: now,
        password: hashed,
        metadataId: metadata.id, // assign foreign key
      },
    });

    LoggingService.log({
      source: "services:accounts:create",
      level: "important",
      message: "User account created successfully",
      traceId: options.traceId,
      details: {
        accountId: String((account as any).id),
        createdBy: createdById ? String(createdById) : null,
        roleId: String(roleId),
        email,
        name,
      },
      duration: Number((performance.now() - startTime).toFixed(3)),
      _references: {
        accountId: "Account",
        createdBy: "Account",
        roleId: "AccountRole",
      },
    });

    return account;
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if ((err.meta as any)?.target?.includes?.("emailValue")) {
        throw new EmailInUseError("Email already in use");
      }
    }

    throw err;
  }
}

// Retry wrapper
export async function createUserAccountWithRetry(
  parameters: CreateUserParameters,
  options: CreateUserOptions = {},
): Promise<Account> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await createUserAccount(parameters, options);
      } catch (error: any) {
        if (error instanceof EmailInUseError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:accounts:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account creation (attempt ${attempt})`,
          details: {
            error: error?.message,
            stack: error?.stack,
          },
        });

        throw error; // retryable error
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
