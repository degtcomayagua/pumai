import { Request, Response, NextFunction } from "express";

import * as AccountAPITypes from "../../../../shared/api/accounts";

import { updateAccountWithRetry } from "../../services/accounts/update";
import LoggingService from "../../services/logging";
import { APIError } from "../../errors/api";

import prismaClient from "../../config/prisma";

import { CampusCode } from "../../../../generated/prisma/enums";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.UpdateRequestBody>,
  res: Response<AccountAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const userAccount = req.user!;
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

    const adminRoleLevel = userAccount.role.level ?? 1000;
    if (role.level <= adminRoleLevel) {
      throw new APIError<AccountAPITypes.UpdateResponseData["status"]>(
        "role-cannot-be-assigned",
        401,
      );
    }

    const updatedAccount = await updateAccountWithRetry(
      {
        accountId,
        roleId: roleId,
        campus: campus as CampusCode, // Checked by Zod schema, safe to assert
        email: email?.toLowerCase(),
        name: name?.trim(),
        password: password,
      },
      {
        traceId: req.traceId,
        userAccount: userAccount,
      },
    );

    res.status(200).json({
      status: "success",
      account: updatedAccount,
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
    });

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
