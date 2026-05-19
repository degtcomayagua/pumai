import { Request, Response, NextFunction } from "express";
import prismaClient from "../../config/prisma.js";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles.js";

import LoggingService from "../../services/logging.js";
import { Prisma } from "@prisma/client";

type AccountRoleSelect = Prisma.AccountRoleSelect;
type AccountRoleInclude = Prisma.AccountRoleInclude;

import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.GetRequestBody>,
  res: Response<AccountRolesAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleIds, fields, populate } = req.body;

  try {
    let fieldsToSelect = getFieldsToSelect<AccountRoleSelect>(fields, {
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

    const roles = await prismaClient.accountRole.findMany({
      where: {
        id: {
          in: roleIds,
        },
        metadata: {
          is: {
            deleted: false,
          },
        },
      },
      select: {
        ...fieldsToSelect,
        ...fieldsToPopulate,
      },
    });

    res.status(200).json({
      status: "success",
      accountRoles: roles,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:get",
        level: "error",
        message: "Error during account roles retrieval",
        traceId: req.traceId,
        duration,
        details: {
          error: error.message,
          stack: error.stack,
          roleIds,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
