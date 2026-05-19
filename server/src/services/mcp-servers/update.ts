import retry from "async-retry";
import { performance } from "perf_hooks";
import {
  Prisma,
  MetadataSource,
  MetadataStatus,
  Account,
  MetadataUpdateHistory,
  MCPServer,
} from "@prisma/client";

import prismaClient from "../../config/prisma.js";
import LoggingService from "../logging.js";
import { DeepPartial } from "@shared/types/custom.js";

type UpdateMCPServerOptions = {
  traceId?: string;
  userAccount?: Account;
};

type UpdateMCPServerParameters = DeepPartial<Omit<MCPServer, "id" | "metadata">> & {
  mcpServerId: string;
};

export class MCPServerNotFoundError extends Error {
  retryable = false;
  constructor() {
    super("not-found");
    this.name = "MCPServerNotFoundError";
  }
}

export async function updateMCPServer(
  params: UpdateMCPServerParameters,
  options: UpdateMCPServerOptions = {},
): Promise<MCPServer> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  const existing = await prismaClient.mCPServer.findUnique({
    where: {
      id: params.mcpServerId,
      metadata: {
        is: {
          deleted: false,
        },
      },
    },
    include: { metadata: { include: { updateHistory: true } } },
  });

  if (!existing) throw new MCPServerNotFoundError();

  const now = new Date();
  const changes: MetadataUpdateHistory["changes"] = {};
  const updatePayload: Prisma.MCPServerUpdateInput = {};

  for (const key of Object.keys(params) as (keyof Omit<MCPServer, "id" | "metadata" | "metadataId">)[]) {
    if (params[key] !== existing[key]) {
      updatePayload[key] = params[key] as any;
      changes[key] = params[key]?.toString();
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    // No changes, return existing
    return existing;
  }

  const historyEntry: Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes,
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  if (existing.metadata) {
    updatePayload.metadata = { update: metadataUpdatePayload };
  } else {
    updatePayload.metadata = {
      create: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccountId,
        updatedAt: now,
        updatedById: userAccountId,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
        updateHistory: { create: historyEntry },
      },
    };
  }

  const updated = await prismaClient.mCPServer.update({
    where: { id: params.mcpServerId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  LoggingService.log({
    source: "services:mcp-servers:update",
    level: "important",
    message: "Admin updated MCP server",
    traceId: options.traceId,
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      mcpServerId: updated.id,
      updatedBy: userAccountId != null ? userAccountId : undefined,
    },
    _references: {
      mcpServerId: "MCPServer",
      updatedBy: "Account",
    },
  });

  return updated;
}

export async function updateMCPServerWithRetry(
  params: UpdateMCPServerParameters,
  options: UpdateMCPServerOptions = {},
): Promise<MCPServer> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateMCPServer(params, options);
      } catch (err: any) {
        if (err instanceof MCPServerNotFoundError) {
          bail(err);
        }

        LoggingService.log({
          source: "services:mcp-servers:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during MCP server update (attempt ${attempt})`,
          details: {
            error: err?.message,
            stack: err?.stack,
          },
        });

        throw err;
      }
    },
    { retries: 3, minTimeout: 1000, maxTimeout: 5000, factor: 2 },
  );
}