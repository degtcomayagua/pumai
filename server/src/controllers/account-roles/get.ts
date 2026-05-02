import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccountRole } from "../../../../shared/models/account-role";
import { IAccount } from "../../../../shared/models/account";
import LoggingService from "../../services/logging";

/**
 * Get account roles by IDs with optional field selection and population.
 */
const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.GetRequestBody>,
  res: Response<AccountRolesAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleIds, fields, populate } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    // Build Prisma select object
    const select: Prisma.AccountRoleSelect | undefined = fields?.length
      ? (Object.fromEntries(
        fields.map((field) => {
          if (field === "metadata") return ["metadata", true];
          return [field, true];
        }),
      ) as Prisma.AccountRoleSelect)
      : undefined;

    // If populate is requested but fields are not, use include
    const include: Prisma.AccountRoleInclude | undefined =
      !fields && populate?.includes("metadata")
        ? { metadata: true }
        : undefined;

    const roles = await prismaClient.accountRole.findMany({
      where: {
        id: { in: roleIds },
        metadata: {
          is: {
            deleted: false,
          },
        },
      },
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    });

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:get",
      level: "info",
      message: "Account roles retrieved successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
        accountRoleIds: roleIds.map((id) => id.toString()).join(","),
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount.id,
      },
    });

    res.status(200).json({
      status: "success",
      accountRoles: roles as unknown as IAccountRole[],
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
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount.id,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
