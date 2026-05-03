import { Request, Response, NextFunction } from "express";

import * as AccountsAPITypes from "../../../../shared/api/accounts.js";

import LoggingService from "../../services/logging.js";

import prismaClient from "../../config/prisma.js";
import { createAccountWithRetry } from "../../services/accounts/create.js";

import { APIError } from "../../errors/api.js";
import { CampusCode } from "../../../../generated/prisma/enums.js";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.CreateRequestBody>,
  res: Response<AccountsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const { name, email, password, roleId, campus } = req.body;
  const adminAccount = req.user!;

  try {
    // Check if the email is in use
    const normalizedEmail = email.trim().toLowerCase();
    const existingAccount = await prismaClient.account.findMany({
      where: {
        email: normalizedEmail,
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "email-in-use",
        400,
      );
    }

    // Check if the role exists
    const role = await prismaClient.accountRole.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "role-not-found",
        400,
      );
    }

    const createdByAccountLevel = adminAccount.role?.level;
    if (typeof createdByAccountLevel === "number" && role.level <= createdByAccountLevel) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "role-cannot-be-assigned",
        400,
      );
    } // Pass session explicitly to service
    if (createdByAccountLevel === undefined) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "internal-error", // Means something very bad happened with the admin account, but we don't want to leak details
        500,
      );
    }

    const createdAccount = await createAccountWithRetry(
      {
        name,
        email,
        campus: campus as CampusCode, // Checked by Zod schema, safe to assert
        password,
        roleId,
      },
      {
        traceId: req.traceId,
        userAccount: adminAccount,
      },
    );

    // Respond with created account (no logging here, service already logged)
    res.status(201).json({
      status: "success",
      account: createdAccount,
    });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:create",
        level: "error",
        message: "Error during user creation",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  }
};

export default handler;
