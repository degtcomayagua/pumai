import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MCPServer,
  MetadataSource,
  MetadataStatus,
  Prisma,
  MCPAuthType,
  MCPServerProtocol,
} from "@prisma/client";

import LoggingService from "../logging.js";

type CreateMCPServerParameters = {
  name: string;
  description: string;
  url: string;

  protocol: MCPServerProtocol;

  isRestricted: boolean;
  allowedRoles: string[]; // String of IDs referencing AccountRoles

  authType: MCPAuthType;
  authToken?: string;
  authHeaderName?: string;
  authKey?: string;
  authUsername?: string;
  authPassword?: string;

  tags: string[];
  iconUrl?: string;
  references: string;
};

type CreateMCPServerOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class MCPServerAlreadyExistsError extends Error {
  retryable = false;
  constructor(message = "mcp-server-name-in-use") {
    super(message);
    this.name = "MCPServerAlreadyExistsError";
  }
}

export async function createMCPDocument(
  params: CreateMCPServerParameters,
  options: CreateMCPServerOptions = {},
): Promise<MCPServer> {
  const startTime = performance.now();

  const {
    name,
    allowedRoles,
    authType,
    description,
    isRestricted,
    protocol,
    references,
    tags,
    url,
    authHeaderName,
    authKey,
    authPassword,
    authToken,
    authUsername,
    iconUrl,
  } = params;

  const now = new Date();
  const userAccount = options.userAccount;

  try {
    // create metadata first
    const metadata = await prismaClient.metadata.create({
      data: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccount?.id ?? null,
        updatedAt: now,
        updatedById: userAccount?.id ?? null,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
      },
    });

    const uniqueTags = [
      ...new Set(params.tags.map((tag) => tag.trim()).filter(Boolean)),
    ];

    // create account role referencing metadataId
    const mcpServer = await prismaClient.mCPServer.create({
      data: {
        name,
        description,
        protocol,
        url,
        isRestricted,
        authType,
        authHeaderName,
        authKey,
        authPassword,
        authToken,
        authUsername,
        iconUrl,
        isActive: false,
        references,
        allowedRoles: {
          connect: allowedRoles.map((roleId) => ({ id: roleId })),
        },
        tags: {
          createMany: {
            data: uniqueTags.map((tag) => ({
              tag,
            })),
            skipDuplicates: true,
          },
        },
        metadataId: metadata.id,
      },
    });

    const duration = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:mcp-servers:create",
      level: "important",
      message: "MCP Server created in database successfully",
      traceId: options.traceId,
      duration,
      details: {
        mcpServerId: mcpServer.id,
        name: mcpServer.name,
      },
      _references: {
        mcpServerId: "MCPServer",
      },
    });

    return mcpServer;
  } catch (err: any) {
    // handle unique constraint on name (P2002)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if ((err.meta as any)?.target?.includes?.("name")) {
        throw new MCPServerAlreadyExistsError();
      }
    }
    throw err;
  }
}

export async function createMCPServerWithRetry(
  params: CreateMCPServerParameters,
  options: CreateMCPServerOptions = {},
): Promise<MCPServer> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await createMCPDocument(params, options);
      } catch (error: any) {
        // non-retryable
        if (error instanceof MCPServerAlreadyExistsError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:mcp-servers:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during MCP server creation (attempt ${attempt})`,
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
