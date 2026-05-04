import { Request, Response, NextFunction } from "express";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import LoggingService from "../../services/logging.js";
import { createWorkflowWithRetry } from "../../services/workflows/create.js";

import { APIError } from "../../errors/api.js";

const handler = async (
  req: Request<{}, {}, WorkflowsAPITypes.CreateRequestBody>,
  res: Response<WorkflowsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const userAccount = req.user!;

  const {
    name,
    description,
    url,
    protocol,
    isRestricted,
    allowedRoles,
    isActive,
    auth,
    type,
    tags,
    iconUrl,
  } = req.body;

  try {
    const workflow = await createWorkflowWithRetry(
      {
        name,
        description,
        url,
        protocol,
        isRestricted,
        allowedRoles: allowedRoles ?? [],
        authType: auth.type,
        authToken: auth.type === "bearer" ? auth.token : undefined,
        authHeaderName: auth.type === "api_key" ? auth.headerName : undefined,
        authKey: auth.type === "api_key" ? auth.key : undefined,
        authUsername: auth.type === "basic" ? auth.username : undefined,
        authPassword: auth.type === "basic" ? auth.password : undefined,
        tags: tags ?? [],
        iconUrl,
        type,
      },
      {
        traceId: req.traceId,
        userAccount,
      },
    );

    res.status(201).json({
      status: "success",
      workflow,
    });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:workflows:create",
        level: "error",
        message: "Error during workflow creation",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  }
};

export default handler;