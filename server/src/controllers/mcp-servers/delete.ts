import { Request, Response, NextFunction } from "express";
import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers.js";

import LoggingService from "../../services/logging.js";

import {
  MCPServerNotFoundError,
  deleteMCPServerWithRetry,
} from "../../services/mcp-servers/delete.js";

import { Prisma } from "../../../../generated/prisma/client.js";

const handler = async (
  req: Request<{}, {}, MCPServersAPITypes.DeleteRequestBody>,
  res: Response<MCPServersAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { mcpServerId } = req.body;
  const userAccount = req.user!;

  try {
    const deletedMCPServer = await deleteMCPServerWithRetry(mcpServerId, {
      traceId: req.traceId,
      userAccount,
    });

    res.status(200).json({
      status: "success",
      mcpServer: deletedMCPServer,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof MCPServerNotFoundError) {
      res.status(404).json({
        status: "mcp-server-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:mcp-servers:delete",
        level: "error",
        message: "Prisma error during MCP server deletion",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:mcp-servers:delete",
        level: "error",
        message: "Error during MCP server deletion",
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