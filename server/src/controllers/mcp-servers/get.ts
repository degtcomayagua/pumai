import { Request, Response, NextFunction } from "express";
import prismaClient from "../../config/prisma.js";

import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers.js";

import LoggingService from "../../services/logging.js";
import { Prisma } from "@prisma/client";

type MCPServerSelect = Prisma.MCPServerSelect;
type MCPServerInclude = Prisma.MCPServerInclude;

import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";

const handler = async (
  req: Request<{}, {}, MCPServersAPITypes.GetRequestBody>,
  res: Response<MCPServersAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { mcpServerIds, fields, populate } = req.body;

  try {
    const fieldsToSelect = getFieldsToSelect<MCPServerSelect>(fields, {
      id: true,
      name: true,
    });

    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        MCPServerInclude,
        NonNullable<MCPServersAPITypes.GetRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};

    const mcpServers = await prismaClient.mCPServer.findMany({
      where: {
        id: {
          in: mcpServerIds,
        },
        metadata: {
          is: {
            deleted: {
              not: true, // Could be undefined
            }
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
      mcpServers,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:mcp-servers:get",
        level: "error",
        message: "Error during MCP servers retrieval",
        traceId: req.traceId,
        duration,
        details: {
          error: error.message,
          stack: error.stack,
          mcpServerIds,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;