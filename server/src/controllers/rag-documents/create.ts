import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

import * as RagDocumentsAPITypes from "../../../../shared/api/rag-documents";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import { createRagDocChunkWithRetry } from "../../services/qdrant/rag-documents/create";
import { createRAGDocumentWithRetry } from "../../services/rag-documents/create";
import OllamaEmbedService from "../../services/ollama/embed";

import { buildTextChunks } from "../../utils/chunking";

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

    // We use a generated document ID because of limitations of Qdrant's upsert 
    // MongoDB IDs are not allowed by Qdrant as point IDs, therefore we generate a separate UUID for the document and use that as the point ID in Qdrant.
    const documentId = uuidv4()

    const ragDocument = await createRAGDocumentWithRetry(
      {
        sourceType,
        archived: false,
        deliveryModes,
        documentId,
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

    // Create the chunks and embeddings for the document content
    const contentChunks = buildTextChunks(content, {
      // We rotate the target size so chunks have different lengths and contexts.
      sizePattern: [2200, 1400, 900],
      overlap: 180,
      minChunkSize: 260,
    });
    for (let index = 0; index < contentChunks.length; index += 1) {
      const chunk = contentChunks[index];
      const embedding = await OllamaEmbedService.getInstance().embedText(chunk);

      await createRagDocChunkWithRetry(
        {
          archived: false,
          docId: documentId,
          chunkIndex: index,
          content: chunk,
          sourceType,
          effectiveFrom: new Date(effectiveFrom),
          effectiveUntil: effectiveUntil
            ? new Date(effectiveUntil)
            : null,
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
    }

    await session.commitTransaction();

    // Respond with created document (no logging here, service already logged)
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
