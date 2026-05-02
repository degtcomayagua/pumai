import { Request, Response, NextFunction } from "express";

import { Prisma } from "../../../../generated/prisma/client";

import * as AccountAPITypes from "../../../../shared/api/accounts";

import prismaClient from "../../config/prisma";

import LoggingService from "../../services/logging";
import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma";
import {
  AccountInclude,
  AccountSelect,
} from "../../../../generated/prisma/models";

const handler = async (
  req: Request<{}, {}, AccountAPITypes.ListRequestBody>,
  res: Response<AccountAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted } = req.body;

  try {
    const where: Prisma.AccountWhereInput = {};
    const fieldsToSelect = getFieldsToSelect<AccountSelect>(fields, {
      id: true,
      name: true,
    });
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        AccountInclude,
        NonNullable<AccountAPITypes.ListRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
        "role": ["id", "name", "level"],
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

    const [accounts, totalAccounts] = await Promise.all([
      prismaClient.account.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          name: "asc",
        },
        select: {
          ...fieldsToSelect,
          ...fieldsToPopulate,
        },
      }),
      prismaClient.account.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      accounts,
      totalAccounts,
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
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
