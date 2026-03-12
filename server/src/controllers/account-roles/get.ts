import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import AccountRoleModel from "../../models/AccountRole";
import LoggingService from "../../services/logging";

import { IAccount } from "../../../../shared/models/account";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.GetRequestBody>,
  res: Response<AccountRolesAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const { roleIds, fields } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const projection = fields?.length
      ? Object.fromEntries(fields.map((field) => [field, 1]))
      : undefined;

    const roles = await AccountRoleModel.find(
      {
        _id: { $in: roleIds.map((id) => new mongoose.Types.ObjectId(id)) },
        "metadata.deleted": { $ne: true },
      },
      projection,
    ).lean();

    res.status(200).json({
      status: "success",
      accountRoles: roles,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:get",
        level: "error",
        message: "Error during account roles retrieval",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
          roleIds: req.body.roleIds,
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
  }
};

export default handler;
