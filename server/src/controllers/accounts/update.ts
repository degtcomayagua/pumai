import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import * as AccountAPITypes from "../../../../shared/api/accounts";

import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

import { updateUserAccountWithRetry } from "../../services/accounts/update";

import LoggingService from "../../services/logging";
import AccountRoleModel from "../../models/AccountRole";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.UpdateRequestBody>,
  res: Response<AccountAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const adminAccount = req.user as IAccount;
  const { accountId, email, notify, name, roleId, password, disableTwoFactor } =
    req.body;

  try {
    session.startTransaction();

    const role = await AccountRoleModel.findById(
      new mongoose.Types.ObjectId(roleId),
    );
    if (!role)
      throw new APIError<AccountAPITypes.UpdateResponseData["status"]>(
        "role-not-found",
        404,
      );
    if (role.level <= (adminAccount.data.role as IAccountRole).level) {
      throw new APIError<AccountAPITypes.UpdateResponseData["status"]>(
        "role-cannot-be-assigned",
        401,
      );
    }

    const account = await updateUserAccountWithRetry(
      {
        accountId,
        data: {
          role: role._id.toString(),
        },
        email: {
          value: email?.toLowerCase(),
        },
        profile: {
          name: name?.trim(),
        },
        preferences: {
          security: {
            password,
            ...(disableTwoFactor ? { tfaSecret: null } : {}),
          },
        },
      },
      {
        session,
        traceId: req.traceId,
        adminAccount,
      },
    );

    await session.commitTransaction();
    await session.endSession();

    if (
      notify &&
      process.env.NODE_ENV === "production" &&
      process.env.EMAIL_SERVICE_ENABLED === "true"
    ) {
      // Notify user about the update via email
      //await EmailService.send({
      //	to: account.email.value,
      //	subject: "Your account has been updated",
      //	template: "account-updated",
      //	context: {
      //		name: account.name,
      //		email: account.email.value,
      //		role: account.roleId,
      //		avatarUrl: account.avatarUrl,
      //	},
      //});
    }

    res.status(200).json({ status: "success", account });
  } catch (error: any) {
    await session.abortTransaction();
    await session.endSession();

    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    LoggingService.log({
      source: "api:accounts:update",
      level: "error",
      message: "Unexpected error during user update",
      traceId: req.traceId,
      details: {
        error: error?.message,
        stack: error?.stack,
        accountId: accountId,
      },
      metadata: {
        createdBy: adminAccount?._id,
        createdAt: new Date(),
      },
      _references: {
        accountId: "Account",
      },
    });

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
