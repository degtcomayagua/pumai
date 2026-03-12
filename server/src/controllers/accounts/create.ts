import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as AccountsAPITypes from "../../../../shared/api/accounts";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import EmailService from "../../services/email";

import { createUserAccountWithRetry } from "../../services/accounts/create";

import AccountModel from "../../models/Account";
import AccountRoleModel from "../../models/AccountRole";
import { IAccountRole } from "../../../../shared/models/account-role";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.CreateRequestBody>,
  res: Response<AccountsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const { name, email, password, notify, roleId, locale } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    session.startTransaction();

    // Check if the email is in use
    const existingAccount = await AccountModel.exists({
      "email.value": email.toLowerCase(),
    }).session(session);
    if (existingAccount) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "email-in-use",
        400,
      );
    }

    // Check if the role exists
    const role = await AccountRoleModel.findById(
      new mongoose.Types.ObjectId(roleId),
    );
    if (!role)
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "role-not-found",
        400,
      );
    if (role.level <= (adminAccount.data.role as IAccountRole).level) {
      throw new APIError<AccountsAPITypes.CreateResponseData["status"]>(
        "role-cannot-be-assigned",
        400,
      );
    }

    // Pass session explicitly to service
    const createdAccount = await createUserAccountWithRetry(
      {
        name,
        email,
        password,
        roleId,
        locale,
      },
      {
        session,
        traceId: req.traceId,
        adminAccount,
      },
    );

    await session.commitTransaction();

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
    await session.abortTransaction();
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
          createdBy: adminAccount?._id,
          createdAt: new Date(),
        },
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  } finally {
    await session.endSession();
  }
};

export default handler;
