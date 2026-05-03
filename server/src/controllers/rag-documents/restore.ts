import { Request, Response, NextFunction } from "express";

import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents.js";

import LoggingService from "../../services/logging.js";
import {
  RAGDocumentNotFoundError,
  restoreRAGDocumentWithRetry,
} from "../../services/rag-documents/restore.js";

import { Prisma } from "../../../../generated/prisma/client.js";

const handler = async (
  req: Request<{}, {}, RAGDocumentsAPITypes.RestoreRequestBody>,
  res: Response<RAGDocumentsAPITypes.RestoreResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { ragDocumentId } = req.body;
  const userAccount = req.user!;

  try {
    const restoredRAGDocument = await restoreRAGDocumentWithRetry(ragDocumentId, {
      traceId: req.traceId,
      userAccount,
    });



    res.status(200).json({
      status: "success",
      ragDocument: restoredRAGDocument,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof RAGDocumentNotFoundError) {
      res.status(404).json({
        status: "rag-document-not-found",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:rag-documents:restore",
        level: "error",
        message: "Prisma error during RAG document restore",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:restore",
        level: "error",
        message: "Error during RAG document restore",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        duration,
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;

