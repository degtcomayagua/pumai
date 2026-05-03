import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  RAGDocument,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "../../../../generated/prisma/client.js";

import LoggingService from "../../services/logging.js";
import { MetadataUpdateHistoryCreateWithoutMetadataInput } from "../../../../generated/prisma/models.js";

type RestoreRAGDocumentOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class RAGDocumentNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "RAGDocumentNotFoundError";
  }
}

export async function restoreRAGDocument(
  ragDocumentId: string,
  options: RestoreRAGDocumentOptions = {},
): Promise<RAGDocument> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch rag document with metadata + updateHistory
  const existingRAGDocument = await prismaClient.rAGDocument.findUnique({
    where: {
      id: ragDocumentId,
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

  if (!existingRAGDocument) {
    throw new RAGDocumentNotFoundError(
      "RAG document not found or already restored",
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

  let updatePayload: Prisma.RAGDocumentUpdateInput;

  // Update the metadata
  if (existingRAGDocument.metadata) {
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
  const restored = await prismaClient.rAGDocument.update({
    where: { id: ragDocumentId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:rag-documents:restore",
    level: "important",
    message: "RAG document restored",
    traceId: options.traceId,
    details: {
      ragDocumentId: String(restored.id),
      ...(userAccountId !== null ? { restoredBy: userAccountId } : {}),
    },
    duration: durationMs,
    _references: {
      ragDocumentId: "RAGDocument",
      ...(userAccountId !== null ? { restoredBy: "Account" } : {}),
    },
  });

  return restored;
}

export async function restoreRAGDocumentWithRetry(
  ragDocumentId: string,
  options: RestoreRAGDocumentOptions = {},
): Promise<RAGDocument> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreRAGDocument(ragDocumentId, options);
      } catch (error: any) {
        if (error instanceof RAGDocumentNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:rag-documents:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during RAG document restoration (attempt ${attempt})`,
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
