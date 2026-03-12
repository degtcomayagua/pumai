import { Request, Response, NextFunction } from "express";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import AccountRoleModel from "../../models/AccountRole";
import LoggingService from "../../services/logging";

import { IAccount } from "../../../../shared/models/account";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.ListRequestBody>,
  res: Response<AccountRolesAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const adminAccount = req.user as IAccount;
  const { count, page, search, includeDeleted, fields } = req.body;

  try {
    let queryFilters: Record<string, any> = {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      const searchRegex = new RegExp(search.query, "i");
      queryFilters = {
        ...queryFilters,
        $or: search.searchIn.map((field) => ({
          [field]: searchRegex,
        })),
      };
    }
    if (!includeDeleted) {
      queryFilters["metadata.deleted"] = { $ne: true };
    }

    const projection = fields?.length
      ? Object.fromEntries(fields.map((f) => [f, 1]))
      : undefined;

    const cursor = AccountRoleModel.find(queryFilters, projection)
      .skip(page * count)
      .limit(count)
      .lean();

    const [accountRoles, totalAccountRoles] = await Promise.all([
      cursor.exec(),
      AccountRoleModel.countDocuments(queryFilters),
    ]);

    res.status(200).json({
      status: "success",
      accountRoles,
      totalAccountRoles,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:list",
        level: "error",
        message: "Error during account roles listing",
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
  }
};

export default handler;
