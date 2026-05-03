import { Request, Response, NextFunction } from "express";

import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers.js";

import LoggingService from "../../services/logging.js";
import { createMCPServerWithRetry } from "../../services/mcp-servers/create.js";

import { APIError } from "../../errors/api.js";

const handler = async (
  req: Request<{}, {}, MCPServersAPITypes.CreateRequestBody>,
  res: Response<MCPServersAPITypes.CreateResponseData>,
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
    tags,
    iconUrl,
    _references,
  } = req.body;

  try {
    const mcpServer = await createMCPServerWithRetry(
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
        references: _references ? JSON.stringify(_references) : "",
      },
      {
        traceId: req.traceId,
        userAccount,
      },
    );

    res.status(201).json({
      status: "success",
      mcpServer,
    });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:mcp-servers:create",
        level: "error",
        message: "Error during MCP server creation",
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