import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import {
  AccountRoleNotFoundError,
  deleteAccountRoleWithRetry,
} from "../../services/account-roles/delete";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.DeleteRequestBody>,
  res: Response<AccountRolesAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const { roleId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    session.startTransaction();

    const deletedRole = await deleteAccountRoleWithRetry(roleId, {
      session,
      traceId: req.traceId,
      adminAccount,
    });

    await session.commitTransaction();

    res.status(200).json({
      status: "success",
      accountRole: deletedRole,
    });
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof AccountRoleNotFoundError) {
      res.status(404).json({
        status: "role-not-found",
      });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:delete",
        level: "error",
        message: "Error during account role deletion",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount._id,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  } finally {
    await session.endSession();
  }
};

export default handler;
