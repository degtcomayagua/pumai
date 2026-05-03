import { performance } from "perf_hooks";
import retry from "async-retry";

import { IAccount } from "../../../../../shared/models/account.js";

import LoggingService from "../../logging.js";

import {
  buildRagChunkPayloadPatch,
  buildRagDocIdFilter,
  getQdrantClient,
  RAG_DOC_CHUNKS_COLLECTION,
} from "./shared.js";

type RestoreRagChunksOptions = {
  traceId?: string;
  adminAccount?: IAccount;
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

export async function restoreRagChunksByDocId(
  docId: string,
  options: RestoreRagChunksOptions = {},
): Promise<void> {
  const startTime = performance.now();
  const client = await assertRagChunksExist(docId);

  await client.setPayload(RAG_DOC_CHUNKS_COLLECTION, {
    filter: buildRagDocIdFilter(docId),
    payload: buildRagChunkPayloadPatch({
      docId,
      archived: false,
    }),
  });

  LoggingService.log({
    source: "services:qdrant:rag-doc-chunks:restore",
    level: "important",
    traceId: options.traceId,
    message: "RAG document chunks restored",
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      docId,
      ...(options.adminAccount && {
        restoredBy: options.adminAccount.id.toString(),
      }),
    },
  });
}

export async function restoreRagChunksByDocIdWithRetry(
  docId: string,
  options: RestoreRagChunksOptions = {},
): Promise<void> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();

      try {
        return await restoreRagChunksByDocId(docId, options);
      } catch (error: any) {
        if (error instanceof RagChunksNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:qdrant:rag-doc-chunks:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during rag document chunk restore (attempt ${attempt})`,
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