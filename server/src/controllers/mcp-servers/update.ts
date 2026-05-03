import { Request, Response, NextFunction } from "express";
import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers.js";

import LoggingService from "../../services/logging.js";
import {
  MCPServerNotFoundError,
  updateMCPServer,
} from "../../services/mcp-servers/update.js";

import { Prisma } from "../../../../generated/prisma/client.js";

const handler = async (
  req: Request<{}, {}, MCPServersAPITypes.UpdateRequestBody>,
  res: Response<MCPServersAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const {
    mcpServerId,
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
  const userAccount = req.user!;

  try {
    const updatedMCPServer = await updateMCPServer(
      {
        mcpServerId,
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
        references: _references ? JSON.stringify(_references) : undefined,
      },
      {
        traceId: req.traceId,
        userAccount,
      },
    );

    const duration = performance.now() - start;
    LoggingService.log({
      source: "api:mcp-servers:update",
      level: "info",
      message: "MCP server updated successfully",
      traceId: req.traceId,
      duration,
      details: {
        updatedById: userAccount.id,
        mcpServerId: updatedMCPServer.id,
      },
      _references: {
        updatedById: "Account",
        mcpServerId: "MCPServer",
      },
    });

    res.status(200).json({
      status: "success",
      mcpServer: updatedMCPServer,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof MCPServerNotFoundError) {
      res.status(404).json({ status: "mcp-server-not-found" });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:mcp-servers:update",
        level: "error",
        message: "Prisma error during MCP server update",
        traceId: req.traceId,
        details: { code: error.code, meta: error.meta },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:mcp-servers:update",
        level: "error",
        message: "Error during MCP server update",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;