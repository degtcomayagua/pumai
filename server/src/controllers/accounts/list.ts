import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../../generated/prisma/client";
import * as AccountsAPITypes from "../../../../shared/api/accounts";
import prismaClient from "../../config/prisma";
import { IAccount } from "../../../../shared/models/account";
import LoggingService from "../../services/logging";

/**
 * Builds Prisma query args
 */
const buildQueryArgs = (
  fields?: string[],
  populate?: string[],
): {
  select?: Prisma.AccountSelect;
  include?: Prisma.AccountInclude;
} => {
  const hasFields = Array.isArray(fields) && fields.length > 0;
  const hasPopulate = Array.isArray(populate) && populate.length > 0;

  if (hasFields) {
    const select: Prisma.AccountSelect = {
      id: true,
    };

    for (const field of fields!) {
      if (field === "role" || field === "metadata") continue;
      (select as any)[field] = true;
    }

    if (hasPopulate) {
      for (const relation of populate!) {
        if (relation === "role") {
          select.role = true;
        }
        if (relation === "metadata") {
          select.metadata = true;
        }
      }
    }

    return { select };
  }

  if (hasPopulate) {
    const include: Prisma.AccountInclude = {};

    for (const relation of populate!) {
      if (relation === "role") include.role = true;
      if (relation === "metadata") include.metadata = true;
    }

    return { include };
  }

  return {};
};

const handler = async (
  req: Request<{}, {}, AccountsAPITypes.ListRequestBody>,
  res: Response<AccountsAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, filters, fields, populate, search, includeDeleted } =
    req.body;
  const adminAccount = req.user as IAccount;

  try {
    const where: Prisma.AccountWhereInput = {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      where.OR = search.searchIn.map((field) => ({
        [field]: {
          contains: search.query,
        },
      })) as Prisma.AccountWhereInput[];
    }

    if (filters) {
      if (filters.role) {
        where.roleId = filters.role;
      }
      if (filters.campus) {
        where.campus = filters.campus as any;
      }
    }

    if (!includeDeleted) {
      where.metadata = {
        deleted: false,
      };
    }
    const queryArgs = buildQueryArgs(fields, populate);

    const [accounts, totalAccounts] = await Promise.all([
      prismaClient.account.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          metadata: {
            createdAt: "desc",
          },
        },
        ...queryArgs,
      }),
      prismaClient.account.count({ where }),
    ]);

    const duration = performance.now() - start;

    LoggingService.log({
      source: "api:accounts:list",
      level: "info",
      traceId: req.traceId,
      message: "Accounts listed successfully",
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
      },
      metadata: {
        createdBy: adminAccount?.id,
        createdAt: new Date(),
      },
    });

    res.status(200).json({
      status: "success",
      accounts: accounts as unknown as IAccount[],
      totalAccounts,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;
    console.log(error);

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during account listing",
        details: { error: error.message, stack: error.stack },
        duration,
        _references: {
          adminAccountId: adminAccount?.id?.toString?.(),
        },
        metadata: {
          createdBy: adminAccount?.id,
          createdAt: new Date(),
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
