import retry from "async-retry";
import { performance } from "perf_hooks";
import {
  Prisma,
  MetadataSource,
  MetadataStatus,
  Account,
  MetadataUpdateHistory,
  RAGDocument,
} from "../../../../generated/prisma/client.js";
import {
  MetadataUpdateHistoryCreateWithoutMetadataInput,
  RAGDocumentUpdateInput,
} from "../../../../generated/prisma/models.js";

import prismaClient from "../../config/prisma.js";
import LoggingService from "../../services/logging.js";

type UpdateRAGDocumentOptions = {
  traceId?: string;
  userAccount?: Account;
};

type UpdateRAGDocumentParameters = Omit<RAGDocument, "id" | "metadata"> & {
  ragDocumentId: string;
}

export class RAGDocumentNotFoundError extends Error {
  retryable = false;
  constructor() {
    super("not-found");
    this.name = "RAGDocumentNotFoundError";
  }
}

export async function updateRAGDocument(
  params: UpdateRAGDocumentParameters,
  options: UpdateRAGDocumentOptions = {},
): Promise<RAGDocument> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  const existing = await prismaClient.rAGDocument.findUnique({
    where: {
      id: params.ragDocumentId,
      metadata: {
        is: {
          deleted: false,
        },
      },
    },
    include: { metadata: { include: { updateHistory: true } } },
  });

  if (!existing) throw new RAGDocumentNotFoundError();

  const now = new Date();
  const changes: MetadataUpdateHistory["changes"] = {};
  const updatePayload: RAGDocumentUpdateInput = {};

  for (const key of Object.keys(params) as (keyof Omit<RAGDocument, "id" | "metadata" | "metadataId">)[]) {
    if (params[key] !== existing[key]) {
      updatePayload[key] = params[key] as any;
      changes[key] = params[key]?.toString();
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    // No changes, return existing
    return existing;
  }

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
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

  const updated = await prismaClient.rAGDocument.update({
    where: { id: params.ragDocumentId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  LoggingService.log({
    source: "services:rag-documents:update",
    level: "important",
    message: "Admin updated RAG document",
    traceId: options.traceId,
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      ragDocumentId: updated.id,
      updatedBy: userAccountId != null ? userAccountId : undefined,
    },
    _references: {
      ragDocumentId: "RAGDocument",
      updatedBy: "Account",
    },
  });

  return updated;
}

export async function updateRAGDocumentWithRetry(
  params: UpdateRAGDocumentParameters,
  options: UpdateRAGDocumentOptions = {},
): Promise<RAGDocument> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateRAGDocument(params, options);
      } catch (err: any) {
        LoggingService.log({
          source: "services:rag-documents:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during RAG document update (attempt ${attempt})`,
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

