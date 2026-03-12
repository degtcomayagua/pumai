import mongoose from "mongoose";
import AccountRoleModel from "../../models/AccountRole";
import LoggingService from "../../services/logging";
import retry from "async-retry";
import { performance } from "perf_hooks";
import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

type RestoreAccountRoleOptions = {
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

export async function restoreAccountRole(
  roleId: string,
  options: RestoreAccountRoleOptions = {},
): Promise<IAccountRole> {
  const startTime = performance.now();
  const adminAccount = options.adminAccount;

  let session = options.session;
  let sessionCreatedWithinService = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const role = await AccountRoleModel.findOne({
      _id: roleId,
      "metadata.deleted": { $ne: false },
    }).session(session);

    if (!role) {
      throw new AccountRoleNotFoundError(
        "Account role not found or already restored",
      );
    }

    const now = new Date();

    const updateHistoryEntry = {
      updatedAt: now,
      updatedBy: adminAccount?._id ?? undefined,
      changes: {
        "metadata.deleted": false,
        "metadata.deletedAt": undefined,
        "metadata.deletedByTerminal": undefined,
        "metadata.deletedBy": undefined,
      },
    };

    role.metadata.deleted = false;
    role.metadata.deletedAt = undefined;
    role.metadata.deletedByTerminal = undefined;
    role.metadata.deletedBy = undefined;

    role.metadata.updatedAt = now;
    role.metadata.updatedBy = adminAccount?._id ?? undefined;

    (role.metadata.updateHistory ?? []).push(updateHistoryEntry);

    await role.save({ session });

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:account-roles:restore",
      level: "important",
      message: "Account role restored",
      traceId: options.traceId,
      details: {
        roleId: role._id.toString(),
        name: role.name,
      },
      duration: durationMs,
      _references: {
        accountRoleId: "AccountRole",
      },
      metadata: {
        createdAt: now,
        createdBy: adminAccount?._id,
        documentVersion: role.metadata.documentVersion || 1,
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

export async function restoreAccountRoleWithRetry(
  roleId: string,
  options: RestoreAccountRoleOptions = {},
): Promise<IAccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreAccountRole(roleId, options);
      } catch (error: any) {
        if (error instanceof AccountRoleNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role restore (attempt ${attempt})`,
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
