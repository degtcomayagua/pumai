import mongoose from "mongoose";
import RAGDocumentModel from "../../models/RAGDocument";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../../contracts/pumai/models/account";
import retry from "async-retry";
import { performance } from "perf_hooks";
import { IRAGDocument } from "../../../../../contracts/pumai/models/rag-document";

type DeleteRAGDocumentOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
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
): Promise<IRAGDocument> {
  const startTime = performance.now();
  const adminAccount = options.adminAccount ?? undefined;

  let session = options.session;
  let sessionCreatedWithinService = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedWithinService = true;
  }

  try {
    const ragDocument = await RAGDocumentModel.findOne({
      _id: ragDocumentId,
      "metadata.deleted": { $ne: true },
    }).session(session);

    if (!ragDocument) {
      throw new RAGDocumentNotFoundError(
        "RAG Document not found or already deleted",
      );
    }

    const now = new Date();

    const updateHistoryEntry = {
      updatedAt: now,
      updatedBy: adminAccount?._id,
      changes: {
        "metadata.deleted": true,
        "metadata.deletedAt": now,
        ...(adminAccount && {
          "metadata.deletedBy": adminAccount._id,
        }),
      },
    };

    ragDocument.metadata.deleted = true;
    ragDocument.metadata.deletedAt = now;
    if (adminAccount) ragDocument.metadata.deletedBy = adminAccount._id;
    ragDocument.metadata.updatedAt = now;
    if (adminAccount) ragDocument.metadata.updatedBy = adminAccount._id;
    ragDocument.metadata.updateHistory =
      ragDocument.metadata.updateHistory || [];
    ragDocument.metadata.updateHistory.push(updateHistoryEntry);

    await ragDocument.save({ session });

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "api:rag-documents:delete",
      level: "important",
      message: "Rag document deleted",
      traceId: options.traceId,
      details: {
        ragDocumentId: ragDocument._id.toString(),
        ...(adminAccount && {
          deletedBy: adminAccount._id.toString(),
        }),
      },
      duration: durationMs,
      _references: {
        ragDocumentId: "RAGDocument",
        ...(adminAccount && { deletedBy: "Account" }),
      },
      metadata: {
        createdAt: now,
        updateHistory: [updateHistoryEntry],
        ...(adminAccount && {
          createdBy: adminAccount._id,
        }),
        documentVersion: ragDocument.metadata.documentVersion || 1,
      },
    });

    if (sessionCreatedWithinService) {
      await session.commitTransaction();
      session.endSession();
    }

    return ragDocument;
  } catch (err) {
    if (sessionCreatedWithinService) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

export async function deleteRAGDocumentWithRetry(
  ragDocumentId: string,
  options: DeleteRAGDocumentOptions = {},
): Promise<IRAGDocument> {
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
          source: "api:rag-documents:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during rag document deletion (attempt ${attempt})`,
          details: { error: error.message, stack: error.stack },
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
