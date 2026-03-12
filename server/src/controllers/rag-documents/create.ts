import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

import * as RagDocumentsAPITypes from "../../../../../contracts/pumai/api/rag-documents";
import { IAccount } from "../../../../../contracts/pumai/models/account";

import LoggingService from "../../services/logging";

import { createRagDocChunkWithRetry } from "../../services/chroma/rag-documents/create";
import { createRAGDocumentWithRetry } from "src/services/rag-documents/create";

import OllamaEmbedService from "../../services/ollama/embed";

import { APIError } from "../../errors/api";

const handler = async (
  req: Request<{}, {}, RagDocumentsAPITypes.CreateRequestBody>,
  res: Response<RagDocumentsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const adminAccount = req.user as IAccount;

  const {
    sourceType,
    deliveryModes,
    title,
    campuses,
    content,
    authorityLevel,
    warnings,
    summary,
    category,
    effectiveFrom,
    effectiveUntil,
    tags,
  } = req.body;

  try {
    session.startTransaction();

    const embedding = await OllamaEmbedService.getInstance().embedText(
      content as string, // TODO: Temporal, sometimes content comes as a file
    );

    const ragDocument = await createRAGDocumentWithRetry(
      {
        sourceType,
        archived: false,
        deliveryModes,
        title,
        campuses,
        authorityLevel,
        warnings: warnings || {},
        summary,
        category,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        tags: tags || [],
      },
      {
        session,
        traceId: req.traceId,
        adminAccount,
      },
    );

    // TOOD: Separate content into separate chunks if needed
    createRagDocChunkWithRetry(
      {
        archived: false,
        docId: ragDocument._id,
        chunkIndex: 0,
        content: content as string,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveUntil: effectiveUntil
          ? new Date(effectiveUntil).toISOString()
          : "",
        warnings: {
          ...warnings,
        },
        deliveryModes: deliveryModes,
        campuses: campuses,
        authorityLevel,
        category,
        embedding,
      },
      {
        traceId: req.traceId,
      },
    );

    await session.commitTransaction();

    // Respond with created account (no logging here, service already logged)
    res.status(201).json({
      status: "success",
    });
  } catch (error: unknown) {
    console.log(error);
    await session.abortTransaction();
    if (error instanceof APIError) {
      res.status(error.httpStatus).send({ status: error.status });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:create",
        level: "error",
        message: "Error during RAG document creation",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdBy: adminAccount?._id,
          createdAt: new Date(),
        },
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  } finally {
    await session.endSession();
  }
};

export default handler;
