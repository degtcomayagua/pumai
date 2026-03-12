import { Request, Response, NextFunction } from "express";

import * as RAGDocumentAPITypes from "../../../../../contracts/pumai/api/rag-documents";
import { IAccount } from "../../../../../contracts/pumai/models/account";

import LoggingService from "../../services/logging";
import {
  RAGDocumentNotFoundError,
  deleteRAGDocumentWithRetry,
} from "../../services/rag-documents/delete";

const handler = async (
  req: Request<{}, {}, RAGDocumentAPITypes.DeleteRequestBody>,
  res: Response<RAGDocumentAPITypes.DeleteResponseData>,
  _next: NextFunction,
) => {
  const { ragDocumentId } = req.body;
  const adminAccount = req.user as IAccount;

  try {
    const deletedRAGDocument = await deleteRAGDocumentWithRetry(ragDocumentId, {
      traceId: req.traceId,
      adminAccount,
    });

    // Also delete from chroma db

    res.status(200).json({
      status: "success",
      ragDocument: deletedRAGDocument,
    });
  } catch (error: unknown) {
    if (error instanceof RAGDocumentNotFoundError) {
      res.status(404).json({
        status: "rag-document-not-found",
      });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:delete",
        level: "error",
        message: "Error during cai deletion",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdAt: new Date(),
          createdBy: adminAccount._id,
        },
      });
    }
    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
