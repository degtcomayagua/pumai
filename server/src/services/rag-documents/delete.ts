import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  RAGDocument,
  MetadataSource,
  MetadataStatus,
  Prisma,
} from "@prisma/client";

import LoggingService from "../../services/logging.js";

type DeleteRAGDocumentOptions = {
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

export async function deleteRAGDocument(
  ragDocumentId: string,
  options: DeleteRAGDocumentOptions = {},
): Promise<RAGDocument> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch RAG Document with metadata + updateHistory
  const existingRAGDocument = await prismaClient.rAGDocument.findUnique({
    where: {
      id: ragDocumentId,
      metadata: {
        is: {
          deleted: false,
        },
      },
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
    throw new RAGDocumentNotFoundError("RAG document not found or already deleted");
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
  const deleted = await prismaClient.rAGDocument.update({
    where: { id: ragDocumentId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:rag-documents:delete",
    level: "important",
    message: "RAG document deleted",
    traceId: options.traceId,
    details: {
      ragDocumentId: String(deleted.id),
      ...(userAccountId !== null ? { deletedBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      ragDocumentId: "RAGDocument",
    },
  });

  return deleted;
}

export async function deleteRAGDocumentWithRetry(
  ragDocumentId: string,
  options: DeleteRAGDocumentOptions = {},
): Promise<RAGDocument> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteRAGDocument(ragDocumentId, options);
      } catch (error: any) {
        if (error instanceof RAGDocumentNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:rag-documents:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during RAG document deletion (attempt ${attempt})`,
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
