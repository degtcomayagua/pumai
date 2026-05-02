import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts";
import { IAccount } from "../../../../shared/models/account";
import { IAccountRole } from "../../../../shared/models/account-role";

import { updateUserAccountWithRetry } from "../../services/accounts/update";
import LoggingService from "../../services/logging";
import { APIError } from "../../errors/api";

import { Prisma } from "../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.UpdateRequestBody>,
  res: Response<AccountAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const adminAccount = req.user as IAccount;
  const { accountId, email, name, roleId, password, campus } = req.body;

  try {
    // Validate the role exists and admin can assign it
    const role = await prismaClient.accountRole.findUnique({
      where: { id: roleId },
      include: { metadata: true },
    });

    if (!role || role.metadata?.deleted) {
      throw new APIError<AccountAPITypes.UpdateResponseData["status"]>(
        "role-not-found",
        404,
      );
    }

    const adminRoleLevel = (adminAccount.role as IAccountRole)?.level ?? 0;
    if (role.level <= adminRoleLevel) {
      throw new APIError<AccountAPITypes.UpdateResponseData["status"]>(
        "role-cannot-be-assigned",
        401,
      );
    }

    const updatedAccount = await updateUserAccountWithRetry(
      {
        accountId,
        roleId: roleId,
        campus: campus,
        email: email?.toLowerCase(),
        name: name?.trim(),
        securityPassword: password,
      },
      {
        traceId: req.traceId,
        adminAccount,
      },
    );

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:accounts:update",
      level: "info",
      message: "User account updated successfully",
      traceId: req.traceId,
      duration,
      _references: {
        accountId: updatedAccount.id.toString(),
        adminAccountId: adminAccount?.id?.toString?.(),
      },
      metadata: {
        createdBy: adminAccount?.id,
        createdAt: new Date(),
      },
    });

    res.status(200).json({
      status: "success",
      account: updatedAccount as unknown as IAccount,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;
    console.log(error);

    if (error instanceof APIError) {
      res.status(error.httpStatus).json({ status: error.status });
      return;
    }

    LoggingService.log({
      source: "api:accounts:update",
      level: "error",
      message: "Unexpected error during user update",
      traceId: req.traceId,
      duration,
      details: {
        error: (error as any)?.message,
        stack: (error as any)?.stack,
        accountId,
      },
      metadata: {
        createdBy: adminAccount?.id,
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
