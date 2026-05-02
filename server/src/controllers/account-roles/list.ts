import { Request, Response, NextFunction } from "express";

import { Prisma } from "../../../../generated/prisma/client";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";

import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";
import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma";
import {
  AccountRoleInclude,
  AccountRoleSelect,
} from "../../../../generated/prisma/models";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.ListRequestBody>,
  res: Response<AccountRolesAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted } = req.body;

  try {
    const where: Prisma.AccountWhereInput = {};
    const fieldsToSelect = getFieldsToSelect<AccountRoleSelect>(fields, {
      id: true,
      name: true,
    });
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        AccountRoleInclude,
        NonNullable<AccountRolesAPITypes.ListRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      where.OR = search.searchIn.map((field) => ({
        [field]: {
          contains: search.query,
        },
      })) as Prisma.AccountWhereInput[];
    }

    if (!includeDeleted) {
      where.metadata = {
        is: {
          deleted: {
            not: true, // Could be undefined
          },
        },
      };
    }

    const [accountRoles, totalAccountRoles] = await Promise.all([
      prismaClient.accountRole.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          level: "asc",
        },
        select: {
          ...fieldsToSelect,
          ...fieldsToPopulate,
        },
      }),
      prismaClient.accountRole.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      accountRoles: accountRoles,
      totalAccountRoles: totalAccountRoles,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:accounts-roles:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during account roles listing",
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
