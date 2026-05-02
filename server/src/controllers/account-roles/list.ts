import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../../../generated/prisma/client";
import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import prismaClient from "../../config/prisma";
import { IAccount } from "../../../../shared/models/account";
import LoggingService from "../../services/logging";
import { IAccountRole } from "../../../../shared/models/account-role";

/**
 * Builds Prisma query args
 */
const buildQueryArgs = (
  fields?: string[],
  populate?: string[],
): {
  select?: Prisma.AccountRoleSelect;
  include?: Prisma.AccountRoleInclude;
} => {
  const hasFields = Array.isArray(fields) && fields.length > 0;
  const hasPopulate = Array.isArray(populate) && populate.length > 0;

  if (hasFields) {
    const select: Prisma.AccountRoleSelect = {
      id: true,
    };

    for (const field of fields!) {
      if (field === "metadata") continue;
      (select as any)[field] = true;
    }

    if (hasPopulate) {
      for (const relation of populate!) {
        if (relation === "metadata") {
          select.metadata = true;
        }
      }
    }

    return { select };
  }

  if (hasPopulate) {
    const include: Prisma.AccountRoleInclude = {};

    for (const relation of populate!) {
      if (relation === "metadata") include.metadata = true;
    }

    return { include };
  }

  return {};
};

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.ListRequestBody>,
  res: Response<AccountRolesAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const where: Prisma.AccountRoleWhereInput = {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      where.OR = search.searchIn.map((field) => ({
        [field]: {
          contains: search.query,
        },
      })) as Prisma.AccountRoleWhereInput[];
    }

    if (!includeDeleted) {
      where.metadata = {
        deleted: false,
      };
    }
    const queryArgs = buildQueryArgs(fields, populate);

    const [accountRoles, totalAccountRoles] = await Promise.all([
      prismaClient.accountRole.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          level: "asc",
        },
        ...queryArgs,
      }),
      prismaClient.accountRole.count({ where }),
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
      accountRoles: accountRoles as any as IAccountRole[],
      totalAccountRoles: totalAccountRoles,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

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
