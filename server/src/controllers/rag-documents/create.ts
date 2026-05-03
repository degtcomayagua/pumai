import { Request, Response, NextFunction } from "express";

import * as RagDocumentsAPITypes from "../../../../shared/api/rag-documents.js";

import LoggingService from "../../services/logging.js";
import { createRagDocChunkWithRetry } from "../../services/qdrant/rag-documents/create.js";
import { createRAGDocumentWithRetry } from "../../services/rag-documents/create.js";
import OllamaEmbedService from "../../services/ollama/embed.js";

import { buildTextChunks } from "../../utils/ai/chunking.js";

import { APIError } from "../../errors/api.js";

import { CampusCode } from "../../../../generated/prisma/enums.js";

const handler = async (
  req: Request<{}, {}, RagDocumentsAPITypes.CreateRequestBody>,
  res: Response<RagDocumentsAPITypes.CreateResponseData>,
  _next: NextFunction,
) => {
  const userAccount = req.user!;

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

    // We use a generated document ID because of limitations of Qdrant's upsert 
    // MongoDB IDs are not allowed by Qdrant as point IDs, therefore we generate a separate UUID for the document and use that as the point ID in Qdrant.
    const ragDocument = await createRAGDocumentWithRetry(
      {
        sourceType,
        archived: false,
        deliveryModes,
        title,
        campuses: campuses as CampusCode[], // Enforced via zod
        authorityLevel,
        warnings: warnings || {},
        summary,
        category,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        tags: tags || [],
      },
      {
        traceId: req.traceId,
        userAccount,
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
          docId: ragDocument.id,
          deliveryModes: deliveryModes,
          campuses: campuses as CampusCode[],
          authorityLevel,
          category,
          embedding,
        },
        {
          traceId: req.traceId,
        },
      );
    }

    // Respond with created document (no logging here, service already logged)
    res.status(201).json({
      status: "success",
    });
  } catch (error: unknown) {
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
      });
      res.status(500).json({
        status: "internal-error",
      });
    }
  }
};

export default handler;
