import retry from "async-retry";
import { performance } from "perf_hooks";

import LoggingService from "../../logging";

import {
  getQdrantClient,
  RAG_DOC_CHUNKS_COLLECTION,
} from "./shared";

import { IRAGChunk } from "../../../../../shared/models/qdrant/rag-chunk";

export type CreateRagDocChunkOptions = {
  traceId?: string;
};

export async function createRagDocChunk(
  parameters: IRAGChunk & { embedding: number[] },
  options: CreateRagDocChunkOptions = {},
): Promise<void> {
  const startTime = performance.now();
  const client = await getQdrantClient();

  await client.upsert(RAG_DOC_CHUNKS_COLLECTION, {
    points: [
      {
        id: parameters.docId,
        vector: parameters.embedding,
        payload: { ...parameters, embedding: undefined },
      },
    ],
  });

  LoggingService.log({
    source: "services:qdrant:rag-doc-chunks:create",
    level: "important",
    traceId: options.traceId,
    message: "RAG document chunk created",
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      docId: parameters.docId,
      chunkIndex: parameters.chunkIndex,
      category: parameters.category,
    },
  });
}

export async function createRagDocChunkWithRetry(
  parameters: IRAGChunk & { embedding: number[] },
  options: CreateRagDocChunkOptions = {},
): Promise<void> {
  return retry(
    async (_, attempt) => {
      const startTime = performance.now();

      try {
        return await createRagDocChunk(parameters, options);
      } catch (error: any) {
        LoggingService.log({
          source: "services:qdrant:rag-doc-chunks:create:retry",
          level: "warning",
          traceId: options.traceId,
          message: `Retryable error creating RAG doc chunk (attempt ${attempt})`,
          duration: Number((performance.now() - startTime).toFixed(3)),
          details: {
            error: error.message,
            stack: error.stack,
          },
        });

        throw error;
      }
    },
    {
      retries: 3,
      minTimeout: 500,
      maxTimeout: 3000,
      factor: 2,
    },
  );
}