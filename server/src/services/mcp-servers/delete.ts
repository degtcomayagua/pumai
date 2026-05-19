import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MCPServer,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "@prisma/client";

import LoggingService from "../logging.js";

type DeleteMCPServerOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class MCPServerNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "MCPServerNotFoundError";
  }
}

export async function deleteMCPServer(
  mcpServerId: string,
  options: DeleteMCPServerOptions = {},
): Promise<MCPServer> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch MCP Server with metadata + updateHistory
  const existingMCPServer = await prismaClient.mCPServer.findFirst({
    where: {
      id: mcpServerId,
    },
    include: {
      metadata: {
        include: {
          updateHistory: true,
        },
      },
    },
  });

  if (!existingMCPServer || existingMCPServer.metadata?.deleted === true) {
    throw new MCPServerNotFoundError("MCP server not found or already deleted");
  }

  const now = new Date();

  const historyEntry: Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": true,
      "metadata.deletedAt": now.toISOString(),
      ...(userAccountId && { "metadata.deletedById": userAccountId }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: true,
    deletedAt: now,
    deletedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  let updatePayload: Prisma.MCPServerUpdateInput;

  // Update the metadata
  if (existingMCPServer.metadata) {
    updatePayload = { metadata: { update: metadataUpdatePayload } };
  } else {
    // In the unlikely case that metadata doesn't exist, create it and mark as deleted
    updatePayload = {
      metadata: {
        create: {
          documentVersion: 1,
          createdAt: now,
          createdById: userAccountId ?? null,
          updatedAt: now,
          updatedById: userAccountId ?? null,
          deleted: true,
          deletedAt: now,
          deletedById: userAccountId ?? null,
          status: MetadataStatus.active,
          source: MetadataSource.manual,
          notes: "",
          tags: "",
          updateHistory: { create: historyEntry },
        },
      },
    };
  }

  // perform update: set metadata.deleted = true and append updateHistory
  const deleted = await prismaClient.mCPServer.update({
    where: { id: mcpServerId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:mcp-servers:delete",
    level: "important",
    message: "MCP server deleted",
    traceId: options.traceId,
    details: {
      mcpServerId: String(deleted.id),
      ...(userAccountId !== null ? { deletedBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      mcpServerId: "MCPServer",
    },
  });

  return deleted;
}

export async function deleteMCPServerWithRetry(
  mcpServerId: string,
  options: DeleteMCPServerOptions = {},
): Promise<MCPServer> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteMCPServer(mcpServerId, options);
      } catch (error: any) {
        if (error instanceof MCPServerNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:mcp-servers:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during MCP server deletion (attempt ${attempt})`,
          details: {
            error: error?.message,
            stack: error?.stack,
          },
        });

        throw error;
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      factor: 2,
    },
  );
}
