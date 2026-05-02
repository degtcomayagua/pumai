import { Request, Response, NextFunction } from "express";
import prismaClient from "../../config/prisma";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";

import LoggingService from "../../services/logging";
import { AccountRoleSelect } from "../../../../generated/prisma/models";

import { getFieldsToSelect } from "../../utils/prisma";


const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.GetRequestBody>,
  res: Response<AccountRolesAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleIds, fields } = req.body;
  const userAccount = req.user!;

  try {
    let fieldsToSelect = getFieldsToSelect<AccountRoleSelect>(fields, {
      id: true,
      name: true
    })
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
      select: fieldsToSelect
    });

    res.status(200).json({
      status: "success",
      accountRoles: roles,
    });

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:get",
      level: "info",
      message: "Account roles retrieved successfully",
      traceId: req.traceId,
      duration,
      details: {
        adminAccountId: userAccount.id,
        accountRoleIds: roleIds.map((id) => id),
      },
      _references: {
        adminAccountId: "Account",
        accountRoleIds: "AccountRole",
      },
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
