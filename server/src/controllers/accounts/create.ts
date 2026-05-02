import { Request, Response, NextFunction } from "express";

import * as AccountsAPITypes from "../../../../shared/api/accounts";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

import prismaClient from "../../config/prisma";
import { createAccountWithRetry } from "../../services/accounts/create";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.CreateRequestBody>,
  res: Response<AccountsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const { name, email, password, notify, roleId, locale, campus } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    // Check if the email is in use
    const normalizedEmail = email.trim().toLowerCase();
    const existingAccount = await prismaClient.account.findFirst({
      where: {
        emailValue: normalizedEmail,
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

    const adminRoleLevel = adminAccount.role?.level;
    if (typeof adminRoleLevel === "number" && role.level <= adminRoleLevel) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "role-cannot-be-assigned",
        400,
      );
    } // Pass session explicitly to service
    if (adminRoleLevel === undefined) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "internal-error", // Means something very bad happened with the admin account, but we don't want to leak details
        500,
      );
    }

    const createdAccount = await createAccountWithRetry(
      {
        name,
        email,
        campus,
        password,
        roleId,
        locale,
      },
      {
        traceId: req.traceId,
        userAccount: adminAccount,
      },
    );

    if (notify) {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.EMAIL_SERVICE_ENABLED === "true"
      ) {
        //const emailToSend = await EmailService.getEmailHTMLTemplate(
        //	"welcome",
        //	locale || "en",
        //	{ name },
        //);
        //await EmailService.sendEmail(email, "Welcome", emailToSend);
      }
    }

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
        metadata: {
          createdBy: adminAccount?.id,
          createdAt: new Date(),
        },
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  }
};

export default handler;
