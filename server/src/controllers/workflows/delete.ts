import { Request, Response, NextFunction } from "express";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import LoggingService from "../../services/logging.js";

import {
  deleteWorkflowWithRetry,
  WorkflowNotFoundError,
} from "../../services/workflows/delete.js";

import { Prisma } from "@prisma/client";

const handler = async (
  req: Request<{}, {}, WorkflowsAPITypes.DeleteRequestBody>,
  res: Response<WorkflowsAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { workflowId } = req.body;
  const userAccount = req.user!;

  try {
    const deletedWorkflow = await deleteWorkflowWithRetry(workflowId, {
      traceId: req.traceId,
      userAccount,
    });

    res.status(200).json({
      status: "success",
      workflow: deletedWorkflow,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof WorkflowNotFoundError) {
      res.status(404).json({
        status: "workflow-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:workflows:delete",
        level: "error",
        message: "Prisma error during workflow deletion",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:workflows:delete",
        level: "error",
        message: "Error during workflow deletion",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        duration,
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
