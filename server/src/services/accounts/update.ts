import bcrypt from "bcrypt";
import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import AccountsModel from "../../models/Account";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";
import { DeepPartial } from "../../../../shared/types/custom";

type UpdateUserOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
};

interface UpdateUserParameters extends DeepPartial<IAccount> {
  accountId: string;
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
    const { accountId, data, email, profile, preferences } = params;
    const adminAccount = options.adminAccount;

    const account = await AccountsModel.findById(accountId).session(session);
    if (!account) throw new AccountNotFoundError();

    const accountUpdatedBy = adminAccount || account;

    const now = new Date();
    const changes: Record<string, any> = {};

    if (email) {
      if (email.value) {
        const exists = await AccountsModel.exists({
          _id: { $ne: accountId },
          "email.value": email.value.toLowerCase(),
        });
        if (exists) throw new EmailInUseError();
        account.email.value = email.value.toLowerCase();
        account.email.lastChanged = now;
        account.email.verified = false;
        changes["email"] = email.value.toLowerCase();
      }
      if (email.verified) {
        account.email.verified = email.verified;
        changes["email.verified"] = email.verified;
      }
      if (email.verificationToken) {
        account.email.verificationToken = email.verificationToken;
        changes["email.verificationToken"] = email.verificationToken;
      }
      if (email.verificationTokenExpires) {
        account.email.verificationTokenExpires = email.verificationTokenExpires;
        changes["email.verificationTokenExpires"] =
          email.verificationTokenExpires;
      }
    }

    if (profile) {
      if (profile.name) {
        account.profile.name = profile.name;
        changes["profile.name"] = profile.name;
      }
    }

    if (data) {
      if (data.role) {
        account.data.role = data.role;
        changes["data.role"] = data.role;
      }
    }

    if (preferences) {
      if (preferences.security) {
        if (
          preferences.security.tfaSecret &&
          preferences.security.tfaSecret !== undefined
        ) {
          account.preferences.security.tfaSecret =
            preferences.security.tfaSecret == ""
              ? null
              : preferences.security.tfaSecret;
          changes["preferences.security.tfaSecret"] =
            preferences.security.tfaSecret == ""
              ? null
              : preferences.security.tfaSecret;
        }
        if (preferences.security.password) {
          account.preferences.security.password = await bcrypt.hash(
            preferences.security.password,
            10,
          );
          account.preferences.security.lastPasswordChange = new Date();
          changes["preferences.security.password"] = "[REDACTED]";
        }
        if (preferences.security.forgotPasswordToken) {
          account.preferences.security.forgotPasswordToken =
            preferences.security.forgotPasswordToken == ""
              ? null
              : preferences.security.forgotPasswordToken;
          changes["preferences.security.forgotPasswordToken"] =
            preferences.security.forgotPasswordToken == ""
              ? null
              : preferences.security.forgotPasswordToken;
        }

        if (preferences.security.forgotPasswordTokenExpires) {
          account.preferences.security.forgotPasswordTokenExpires =
            preferences.security.forgotPasswordTokenExpires;
          changes["preferences.security.forgotPasswordTokenExpires"] =
            preferences.security.forgotPasswordTokenExpires;
        }
      }
    }

    account.metadata.updatedAt = now;
    account.metadata.updatedBy = accountUpdatedBy._id;
    account.metadata.updateHistory = account.metadata.updateHistory || [];
    account.metadata.updateHistory.push({
      updatedAt: now,
      updatedBy: accountUpdatedBy._id,
      changes,
    });

    await account.save({ session });

    const duration = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:accounts:update",
      level: "important",
      message: "Admin updated user account",
      traceId: options.traceId,
      duration,
      details: {
        accountId: account._id.toString(),
        updatedBy: accountUpdatedBy._id.toString(),
      },
      _references: {
        accountId: "Account",
        updatedBy: "Account",
      },
      metadata: {
        createdAt: now,
        updateHistory: [],
        createdBy: accountUpdatedBy._id,
        documentVersion: account.metadata.documentVersion || 1,
      },
    });

    if (sessionCreatedWithinService) {
      await session.commitTransaction();
      session.endSession();
    }

    return account;
  } catch (err) {
    if (sessionCreatedWithinService) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

export async function updateUserAccountWithRetry(
  params: UpdateUserParameters,
  options: UpdateUserOptions = {},
): Promise<IAccount> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateUserAccount(params, options);
      } catch (err: any) {
        if (err.message === "not-found" || err instanceof EmailInUseError) {
          bail(err);
        }

        LoggingService.log({
          source: "services:accounts:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account update (attempt ${attempt})`,
          details: {
            error: err.message,
            stack: err.stack,
          },
        });

        throw err;
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
