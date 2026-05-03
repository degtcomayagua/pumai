import { Request, Response, NextFunction } from "express";

import { Prisma } from "../../../../generated/prisma/client.js";

import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers.js";

import prismaClient from "../../config/prisma.js";

import LoggingService from "../../services/logging.js";
import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";
import {
  MCPServerInclude,
  MCPServerSelect,
} from "../../../../generated/prisma/models.js";

const handler = async (
  req: Request<{}, {}, MCPServersAPITypes.ListRequestBody>,
  res: Response<MCPServersAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted, filters } = req.body;

  try {
    const where: Prisma.MCPServerWhereInput = {};
    const fieldsToSelect = getFieldsToSelect<MCPServerSelect>(fields, {
      id: true,
      name: true,
    });
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        MCPServerInclude,
        NonNullable<MCPServersAPITypes.ListRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      where.OR = search.searchIn.map((field) => ({
        [field]: {
          contains: search.query,
        },
      })) as Prisma.MCPServerWhereInput[];
    }

    if (filters) {
      if (filters.protocol !== undefined) where.protocol = filters.protocol;
      if (filters.isRestricted !== undefined) where.isRestricted = filters.isRestricted;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
    }

    if (!includeDeleted) {
      where.metadata = {
        is: {
          deleted: {
            not: true,
          },
        },
      };
    }

    const [mcpServers, totalMcpServers] = await Promise.all([
      prismaClient.mCPServer.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          name: "asc",
        },
        select: {
          ...fieldsToSelect,
          ...fieldsToPopulate,
        },
      }),
      prismaClient.mCPServer.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      mcpServers,
      totalMcpServers,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:mcp-servers:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during MCP servers listing",
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;