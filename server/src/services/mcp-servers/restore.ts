import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MCPServer,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "../../../../generated/prisma/client.js";

import LoggingService from "../logging.js";
import { MetadataUpdateHistoryCreateWithoutMetadataInput } from "../../../../generated/prisma/models.js";

type RestoreMCPServerOptions = {
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

export async function restoreMCPServer(
  mcpServerId: string,
  options: RestoreMCPServerOptions = {},
): Promise<MCPServer> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch mcp server with metadata + updateHistory
  const existingMCPServer = await prismaClient.mCPServer.findUnique({
    where: {
      id: mcpServerId,
      metadata: {
        is: {
          deleted: true,
        }
      }
    },
    include: {
      metadata: {
        include: {
          updateHistory: true,
        },
      },
    },
  });

  if (!existingMCPServer) {
    throw new MCPServerNotFoundError(
      "MCP server not found or already restored",
    );
  }

  const now = new Date();

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": false,
      "metadata.deletedAt": null,
      ...(userAccountId && { "metadata.deletedById": null }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: false,
    deletedAt: null,
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
          deleted: false,
          deletedAt: null,
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
  const restored = await prismaClient.mCPServer.update({
    where: { id: mcpServerId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:mcp-servers:restore",
    level: "important",
    message: "MCP server restored",
    traceId: options.traceId,
    details: {
      mcpServerId: String(restored.id),
      ...(userAccountId !== null ? { restoredBy: userAccountId } : {}),
    },
    duration: durationMs,
    _references: {
      mcpServerId: "MCPServer",
      ...(userAccountId !== null ? { restoredBy: "Account" } : {}),
    },
  });

  return restored;
}

export async function restoreMCPServerWithRetry(
  mcpServerId: string,
  options: RestoreMCPServerOptions = {},
): Promise<MCPServer> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreMCPServer(mcpServerId, options);
      } catch (error: any) {
        if (error instanceof MCPServerNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:mcp-servers:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during MCP server restoration (attempt ${attempt})`,
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