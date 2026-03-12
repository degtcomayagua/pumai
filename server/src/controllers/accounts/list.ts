import { Request, Response, NextFunction } from "express";
import * as AccountsAPITypes from "../../../../shared/api/accounts";

import AccountsModel from "../../models/Account";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.ListRequestBody>,
  res: Response<AccountsAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const { page, count, filters, fields, populate, search, includeDeleted } =
    req.body;
  const adminAccount = req.user as IAccount;

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

    if (filters) {
      if (filters.role) {
        queryFilters = {
          ...queryFilters,
          "data.role": filters.role,
        };
      }
    }

    if (!includeDeleted) {
      queryFilters["metadata.deleted"] = { $ne: true };
    }

    let cursor = AccountsModel.find(queryFilters)
      .skip(page * count)
      .limit(count)
      .sort({ "metadata.createdAt": -1 });

    if (fields?.length) {
      cursor = cursor.select(fields.join(" "));
    }

    // Conditionally populate specified relations
    if (Array.isArray(populate)) {
      for (const relation of populate) {
        cursor = cursor.populate(relation);
      }
    }

    const [accounts, totalAccounts] = await Promise.all([
      cursor.lean().exec(),
      AccountsModel.countDocuments(queryFilters),
    ]);

    res.status(200).json({
      status: "success",
      accounts,
      totalAccounts,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during account listing",
        details: { error: error.message, stack: error.stack },
        metadata: {
          createdBy: adminAccount?._id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
