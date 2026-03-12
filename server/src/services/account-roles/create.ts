import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import AccountRoleModel from "../../models/AccountRole";
import { IAccountRole } from "../../../../shared/models/account-role";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

type CreateAccountRoleParameters = {
  name: string;
  description?: string;
  level: number;
  isSystemRole?: boolean;
  requiresTwoFactor?: boolean;
  permissions?: string[];
};

type CreateAccountRoleOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
};

export async function createAccountRole(
  params: CreateAccountRoleParameters,
  options: CreateAccountRoleOptions = {},
): Promise<IAccountRole> {
  const startTime = performance.now();

  let session = options.session;
  let sessionCreatedHere = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedHere = true;
  }

  try {
    const {
      name,
      description = "",
      level,
      isSystemRole = false,
      requiresTwoFactor = false,
      permissions = [],
    } = params;
    const adminAccount = options.adminAccount;
    const now = new Date();

    const role = new AccountRoleModel({
      name,
      description,
      level,
      isSystemRole,
      requiresTwoFactor,
      permissions,
      metadata: {
        documentVersion: 1,
        createdAt: now,
        createdBy: adminAccount?._id,
        updatedAt: now,
        updatedBy: adminAccount?._id,
        updateHistory: [],
      },
    });

    await role.save({ session });

    if (sessionCreatedHere) {
      await session.commitTransaction();
      await session.endSession();
    }

    LoggingService.log({
      source: "services:account-roles:create",
      level: "important",
      message: "Account role created successfully",
      traceId: options.traceId,
      duration: Number((performance.now() - startTime).toFixed(3)),
      details: {
        roleId: role._id.toString(),
        name,
      },
      _references: {
        accountRoleId: "AccountRole",
      },
      metadata: {
        createdBy: adminAccount?._id.toString(),
        createdAt: now,
      },
    });

    return role;
  } catch (error) {
    if (sessionCreatedHere) {
      await session.abortTransaction();
      await session.endSession();
    }
    throw error;
  }
}

export async function createAccountRoleWithRetry(
  params: CreateAccountRoleParameters,
  options: CreateAccountRoleOptions = {},
): Promise<IAccountRole> {
  return retry(
    async (_, attempt) => {
      const startTime = performance.now();
      try {
        return await createAccountRole(params, options);
      } catch (error: any) {
        LoggingService.log({
          source: "services:account-roles:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role creation (attempt ${attempt})`,
          details: {
            error: error.message,
            stack: error.stack,
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
