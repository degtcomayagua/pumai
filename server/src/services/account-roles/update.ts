import mongoose from "mongoose";
import AccountRoleModel from "../../models/AccountRole";
import LoggingService from "../../services/logging";
import retry from "async-retry";
import { performance } from "perf_hooks";
import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";
import { Permission } from "../../../../shared/types/permissions";

type UpdateAccountRoleParameters = {
  roleId: string;
  name?: string;
  description?: string;
  level?: number;
  permissions?: string[];
  requiresTwoFactor?: boolean;
};

type UpdateAccountRoleOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
};

export class AccountRoleNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "AccountRoleNotFoundError";
  }
}

export async function updateAccountRole(
  params: UpdateAccountRoleParameters,
  options: UpdateAccountRoleOptions,
): Promise<IAccountRole> {
  const startTime = performance.now();
  let session = options.session;
  let sessionCreatedWithinService = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const { roleId, name, description, level, permissions, requiresTwoFactor } =
      params;
    const adminAccount = options.adminAccount;

    const role = await AccountRoleModel.findOne({
      _id: roleId,
      "metadata.deleted": { $ne: true },
    }).session(session);

    if (!role) {
      throw new AccountRoleNotFoundError("Account role not found or deleted");
    }

    const now = new Date();
    const changes: Record<string, any> = {};

    if (name !== undefined) {
      role.name = name;
      changes.name = name;
    }
    if (description !== undefined) {
      role.description = description;
      changes.description = description;
    }
    if (level !== undefined) {
      role.level = level;
      changes.level = level;
    }
    if (permissions !== undefined) {
      role.permissions = permissions as Permission[];
      changes.permissions = permissions;
    }
    if (requiresTwoFactor !== undefined) {
      role.requiresTwoFactor = requiresTwoFactor;
      changes.requiresTwoFactor = requiresTwoFactor;
    }

    role.metadata.updatedAt = now;
    if (adminAccount) {
      role.metadata.updatedBy = adminAccount._id;
    }
    role.metadata.updateHistory = role.metadata.updateHistory || [];
    role.metadata.updateHistory.push({
      updatedAt: now,
      updatedBy: adminAccount?._id,
      changes,
    });

    await role.save({ session });

    LoggingService.log({
      source: "services:account-roles:update",
      level: "important",
      message: "Account role updated",
      traceId: options.traceId,
      details: {
        roleId: role._id.toString(),
        changes,
      },
      duration: Number((performance.now() - startTime).toFixed(3)),
      _references: {
        roleId: "AccountRole",
      },
      metadata: {
        createdAt: role.metadata.createdAt,
        createdBy: role.metadata.createdBy,
      },
    });

    if (sessionCreatedWithinService) {
      await session.commitTransaction();
      session.endSession();
    }

    return role;
  } catch (err) {
    if (sessionCreatedWithinService) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

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
          details: { error: error.message, stack: error.stack },
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
