import { Request, Response, NextFunction } from "express";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import LoggingService from "../../services/logging.js";
import {
  WorkflowNotFoundError,
  updateWorkflow,
} from "../../services/workflows/update.js";

import { Prisma } from "@prisma/client";

const handler = async (
  req: Request<{}, {}, WorkflowsAPITypes.UpdateRequestBody>,
  res: Response<WorkflowsAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const {
    workflowId,
    name,
    description,
    url,
    protocol,
    isRestricted,
    allowedRoles,
    isActive,
    auth,
    tags,
    iconUrl,
  } = req.body;
  const userAccount = req.user!;

  try {
    const updatedWorkflow = await updateWorkflow(
      {
        workflowId,
        name,
        description,
        url,
        protocol,
        isRestricted,
        // allowedRoles, 
        isActive,
        authType: auth?.type,
        authToken: auth?.type === "bearer" ? auth.token : undefined,
        authHeaderName: auth?.type === "api_key" ? auth.headerName : undefined,
        authKey: auth?.type === "api_key" ? auth.key : undefined,
        authUsername: auth?.type === "basic" ? auth.username : undefined,
        authPassword: auth?.type === "basic" ? auth.password : undefined,
        // tags,
        iconUrl,
      },
      {
        traceId: req.traceId,
        userAccount,
      },
    );

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:workflows:update",
      level: "info",
      message: "Workflow updated successfully",
      traceId: req.traceId,
      duration,
      details: {
        updatedById: userAccount.id,
        workflowId: updatedWorkflow.id,
      },
      _references: {
        updatedById: "Account",
        workflowId: "Workflow",
      },
    });

    res.status(200).json({
      status: "success",
      workflow: updatedWorkflow,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof WorkflowNotFoundError) {
      res.status(404).json({ status: "workflow-not-found" });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:workflows:update",
        level: "error",
        message: "Prisma error during workflow update",
        traceId: req.traceId,
        details: { code: error.code, meta: error.meta },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:workflows:update",
        level: "error",
        message: "Error during workflow update",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;