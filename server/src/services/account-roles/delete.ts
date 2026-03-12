import mongoose from "mongoose";
import AccountRoleModel from "../../models/AccountRole";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";
import retry from "async-retry";
import { performance } from "perf_hooks";
import { IAccountRole } from "../../../../shared/models/account-role";

type DeleteAccountRoleOptions = {
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

export async function deleteAccountRole(
  roleId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<IAccountRole> {
  const startTime = performance.now();
  const adminAccount = options.adminAccount;

  let session = options.session;
  let sessionCreatedHere = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedHere = true;
  }

  try {
    const accountRole = await AccountRoleModel.findOne({
      _id: roleId,
      "metadata.deleted": { $ne: true },
    }).session(session);

    if (!accountRole) {
      throw new AccountRoleNotFoundError(
        "Account role not found or already deleted",
      );
    }

    const now = new Date();

    const updateHistoryEntry = {
      updatedAt: now,
      updatedBy: adminAccount?._id,
      changes: {
        "metadata.deleted": true,
        "metadata.deletedAt": now,
        ...(adminAccount && {
          "metadata.deletedBy": adminAccount._id,
        }),
      },
    };

    accountRole.metadata.deleted = true;
    accountRole.metadata.deletedAt = now;

    accountRole.metadata.updatedAt = now;
    accountRole.metadata.updatedBy = adminAccount?._id;
    accountRole.metadata.deletedBy = adminAccount?._id;

    (accountRole.metadata.updateHistory ?? []).push(updateHistoryEntry);

    await accountRole.save({ session });

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:account-roles:delete",
      level: "important",
      message: "Account role deleted",
      traceId: options.traceId,
      details: {
        accountRoleId: accountRole._id.toString(),
        name: accountRole.name,
        ...(adminAccount && { deletedBy: adminAccount._id.toString() }),
      },
      duration: durationMs,
      _references: {
        accountRoleId: "AccountRole",
      },
      metadata: {
        createdAt: now,
        createdBy: adminAccount?._id,
        documentVersion: accountRole.metadata.documentVersion || 1,
      },
    });

    if (sessionCreatedHere) {
      await session.commitTransaction();
      await session.endSession();
    }

    return accountRole;
  } catch (err) {
    if (sessionCreatedHere) {
      await session.abortTransaction();
      await session.endSession();
    }
    throw err;
  }
}

export async function deleteAccountRoleWithRetry(
  roleId: string,
  options: DeleteAccountRoleOptions = {},
): Promise<IAccountRole> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteAccountRole(roleId, options);
      } catch (error: any) {
        if (error instanceof AccountRoleNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:account-roles:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during account role deletion (attempt ${attempt})`,
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
