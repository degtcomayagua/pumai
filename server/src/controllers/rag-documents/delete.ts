import { Request, Response, NextFunction } from "express";
import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents";

import LoggingService from "../../services/logging";

import {
  RAGDocumentNotFoundError,
  deleteRAGDocumentWithRetry,
} from "../../services/rag-documents/delete";

import { Prisma } from "../../../../generated/prisma/client";

const handler = async (
  req: Request<{}, {}, RAGDocumentsAPITypes.DeleteRequestBody>,
  res: Response<RAGDocumentsAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { ragDocumentId } = req.body;
  const userAccount = req.user!;

  try {
    const deletedRole = await deleteRAGDocumentWithRetry(ragDocumentId, {
      traceId: req.traceId,
      userAccount: userAccount,
    });

    res.status(200).json({
      status: "success",
      ragDocument: deletedRole,
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
        source: "api:rag-documents:delete",
        level: "error",
        message: "Prisma error during RAG document deletion",
        traceId: req.traceId,
        details: {
          code: error.code,
          meta: error.meta,
        },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:delete",
        level: "error",
        message: "Error during RAG document deletion",
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
