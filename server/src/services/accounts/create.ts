import bcrypt from "bcrypt";
import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import AccountsModel from "../../models/Account";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

type CreateUserOptions = {
  session?: mongoose.ClientSession;
  traceId?: string; // Unique identifier for tracing requests
  adminAccount?: IAccount; // The account that is creating the user, if applicable
};

type CreateUserParameters = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  locale?: "en" | "es" | "fr" | "de"; // Language for the welcome email and user interface
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
): Promise<IAccount> {
  const startTime = performance.now();

  let session = options.session;
  let sessionCreatedWithinService = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const adminAccount = options.adminAccount;
    const { name, email, password, roleId } = parameters;

    const now = new Date();
    const createdAccount = new AccountsModel({
      email: {
        value: email.toLowerCase(),
      },
      data: {
        // We don't validate roleId here, Role Service should handle it before this point
        role: roleId,
      },
      profile: {
        name,
      },
      preferences: {
        general: {
          language: parameters.locale, // Default to English if not provided
        },
        security: {
          password: await bcrypt.hash(password, 10),
        },
      },
      metadata: {
        documentVersion: 1, // Manually set version for new documents in this context
        updateHistory: [],
        createdAt: now,
        updatedAt: now,
      },
    });
    const accountCreatedBy = adminAccount || createdAccount;
    const updateHistoryEntry = {
      updatedAt: now,
      updatedBy: accountCreatedBy._id,
      changes: {
        email: email.toLowerCase(),
        profile: { name },
        role: roleId,
      },
    };
    createdAccount.metadata.updateHistory!.push(updateHistoryEntry);
    createdAccount.metadata.createdBy = accountCreatedBy._id;
    createdAccount.metadata.updatedBy = accountCreatedBy._id;

    await createdAccount.save({ session });

    LoggingService.log({
      source: "services:accounts:create",
      level: "important",
      message: "User account created successfully",
      traceId: options.traceId,
      details: {
        accountId: createdAccount._id.toString(),
        createdBy: accountCreatedBy._id.toString(),
        roleId: roleId,
        email: email,
        name: name,
      },
      duration: Number((performance.now() - startTime).toFixed(3)),
      _references: {
        accountId: "Account",
        createdBy: "Account",
        roleId: "Role",
      },
      metadata: {
        createdAt: now,
        updateHistory: [updateHistoryEntry],
        createdBy: accountCreatedBy._id,
        documentVersion: createdAccount.metadata.documentVersion || 1,
      },
    });

    if (sessionCreatedWithinService) {
      await session.commitTransaction();
      session.endSession();
    }

    return createdAccount;
  } catch (err) {
    if (sessionCreatedWithinService) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

// Retry wrapper
export async function createUserAccountWithRetry(
  parameters: CreateUserParameters,
  options: CreateUserOptions = {},
): Promise<IAccount> {
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
            error: error.message,
            stack: error.stack,
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
