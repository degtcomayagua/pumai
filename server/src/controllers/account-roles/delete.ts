import { Request, Response, NextFunction } from "express";
import * as AccountRolesAPITypes from "../../../../shared/api/account-roles";
import { IAccount } from "../../../../shared/models/account";
import LoggingService from "../../services/logging";
import {
  AccountRoleNotFoundError,
  deleteAccountRoleWithRetry,
} from "../../services/account-roles/delete";
import { Prisma } from "../../../../generated/prisma/client";
import { IAccountRole } from "../../../../shared/models/account-role";

const handler = async (
  req: Request<{}, {}, AccountRolesAPITypes.DeleteRequestBody>,
  res: Response<AccountRolesAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { roleId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const deletedRole = await deleteAccountRoleWithRetry(roleId, {
      traceId: req.traceId,
      adminAccount,
    });

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:account-roles:delete",
      level: "info",
      message: "Account role deleted successfully",
      traceId: req.traceId,
      duration,
      _references: {
        adminAccountId: adminAccount?.id?.toString?.(),
        accountRoleId: (deletedRole as any)?.id?.toString?.(),
      },
      metadata: {
        createdAt: new Date(),
        createdBy: adminAccount?.id,
      },
    });

    res.status(200).json({
      status: "success",
      accountRole: deletedRole as unknown as IAccountRole,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof AccountRoleNotFoundError) {
      res.status(404).json({
        status: "role-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:account-roles:delete",
        level: "error",
        message: "Prisma error during account role deletion",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:account-roles:delete",
        level: "error",
        message: "Error during account role deletion",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        duration,
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount?.id,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
