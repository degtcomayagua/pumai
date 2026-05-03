import retry from "async-retry";
import { performance } from "perf_hooks";

import LoggingService from "../../logging.js";

import { Account } from "generated/prisma/client.js";


import {
  buildRagDocIdFilter,
  getQdrantClient,
  RAG_DOC_CHUNKS_COLLECTION,
} from "./shared.js";

type DeleteRagChunksOptions = {
  traceId?: string;
  adminAccount?: Account;
};

export async function deleteRagChunksByDocId(
  docId: string,
  options: DeleteRagChunksOptions = {},
): Promise<void> {
  const startTime = performance.now();
  const client = await getQdrantClient();

  const matchingChunks = await client.count(RAG_DOC_CHUNKS_COLLECTION, {
    filter: buildRagDocIdFilter(docId),
  });

  await client.delete(RAG_DOC_CHUNKS_COLLECTION, {
    filter: buildRagDocIdFilter(docId),
  });

  LoggingService.log({
    source: "services:qdrant:rag-doc-chunks:delete",
    level: "important",
    traceId: options.traceId,
    message: "RAG document chunks deleted",
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      docId,
      chunkCount: Number(matchingChunks.count ?? 0),
      ...(options.adminAccount && {
        deletedBy: options.adminAccount.id.toString(),
      }),
    },
  });
}

export async function deleteRagChunksByDocIdWithRetry(
  docId: string,
  options: DeleteRagChunksOptions = {},
): Promise<void> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();

      try {
        return await deleteRagChunksByDocId(docId, options);
      } catch (error: any) {
        LoggingService.log({
          source: "services:qdrant:rag-doc-chunks:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during rag document chunk deletion (attempt ${attempt})`,
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