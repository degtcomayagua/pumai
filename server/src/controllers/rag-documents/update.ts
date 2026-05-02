import { Request, Response, NextFunction } from "express";
import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents";

import LoggingService from "../../services/logging";
import {
  RAGDocumentNotFoundError,
  updateRAGDocument,
} from "../../services/rag-documents/update";

import { Prisma } from "../../../../generated/prisma/client";
import prismaClient from "../../config/prisma";

const handler = async (
  req: Request<{}, {}, RAGDocumentsAPITypes.UpdateRequestBody>,
  res: Response<RAGDocumentsAPITypes.UpdateResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { ragDocumentId } =
    req.body;
  const userAccount = req.user!;

  try {
    // TODO: Fix the parameter handling in zod
    // const updatedRAGDocument = await updateRAGDocument(
    //   {
    //     ragDocumentId,
    //     archived,
    //     authorityLevel,
    //     category,
    //     effectiveFrom,
    //     effectiveUntil,
    //     metadataId,
    //     sourceType,
    //     summary,
    //     title,
    //     warningCampusSpecific,
    //     warningLegal,
    //     warningTimeSensitive,
    //   },
    //   {
    //     traceId: req.traceId,
    //     userAccount: userAccount,
    //   },
    // );

    res.status(200).json({
      status: "success",
      // ragDocument: updatedRAGDocument,
    });
  } catch (error: unknown) {
    const duration = performance.now() - start;

    if (error instanceof RAGDocumentNotFoundError) {
      res.status(404).json({ status: "rag-document-not-found" });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      LoggingService.log({
        source: "api:rag-documents:update",
        level: "error",
        message: "Prisma error during rag document update",
        traceId: req.traceId,
        details: { code: error.code, meta: error.meta },
        duration,
      });
    } else if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:update",
        level: "error",
        message: "Error during rag document update",
        traceId: req.traceId,
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
