import retry from "async-retry";
import { performance } from "perf_hooks";


import LoggingService from "../../logging.js";

import { Account } from "generated/prisma/client.js";

import {
  buildRagChunkPayloadPatch,
  buildRagDocIdFilter,
  getQdrantClient,
  UpdateRagDocChunksParameters,
  RAG_DOC_CHUNKS_COLLECTION,
} from "./shared.js";

type UpdateRagChunksOptions = {
  traceId?: string;
  adminAccount?: Account;
};

export class RagChunksNotFoundError extends Error {
  retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "RagChunksNotFoundError";
  }
}

async function assertRagChunksExist(docId: string) {
  const client = await getQdrantClient();
  const result = await client.scroll(RAG_DOC_CHUNKS_COLLECTION, {
    filter: buildRagDocIdFilter(docId),
    limit: 1,
    with_payload: false,
    with_vector: false,
  });

  if (!result.points?.length) {
    throw new RagChunksNotFoundError(
      "RAG document chunks not found or already deleted",
    );
  }

  return client;
}

export async function updateRagChunksByDocId(
  parameters: UpdateRagDocChunksParameters,
  options: UpdateRagChunksOptions = {},
): Promise<void> {
  const startTime = performance.now();
  const client = await assertRagChunksExist(parameters.docId);
  const payload = buildRagChunkPayloadPatch(parameters);

  if (Object.keys(payload).length === 0) {
    return;
  }

  await client.setPayload(RAG_DOC_CHUNKS_COLLECTION, {
    filter: buildRagDocIdFilter(parameters.docId),
    payload,
  });

  LoggingService.log({
    source: "services:qdrant:rag-doc-chunks:update",
    level: "important",
    traceId: options.traceId,
    message: "RAG document chunks updated",
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      docId: parameters.docId,
      changes: payload,
      ...(options.adminAccount && {
        updatedBy: options.adminAccount.id.toString(),
      }),
    },
  });
}

export async function updateRagChunksByDocIdWithRetry(
  parameters: UpdateRagDocChunksParameters,
  options: UpdateRagChunksOptions = {},
): Promise<void> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();

      try {
        return await updateRagChunksByDocId(parameters, options);
      } catch (error: any) {
        if (error instanceof RagChunksNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:qdrant:rag-doc-chunks:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during rag document chunk update (attempt ${attempt})`,
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