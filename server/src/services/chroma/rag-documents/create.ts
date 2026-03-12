// services/chroma/ragDocChunks.ts

import retry from "async-retry";
import { performance } from "perf_hooks";

import LoggingService from "../../logging";
import ChromaService from "../../chroma";

import OllamaEmbeddingService from "../../ollama/embed";
import {
  CampusCode,
  DeliveryMode,
  DocumentCategory,
} from "../../../../../../contracts/pumai/models";
import { IRAGChunk } from "../../../../../../contracts/pumai/models/chroma/rag-chunk";

export const RAG_DOC_CHUNKS_COLLECTION = "rag-documents";

export type CreateRagDocChunkParameters = {
  chunkIndex: number; // Several chunks for the same document
  docId: string; // Original document docId

  content: string;

  category: DocumentCategory;
  authorityLevel: number;

  campuses: CampusCode[]; // CampusCode[]
  deliveryModes: DeliveryMode[]; // DeliveryMode[]

  effectiveFrom: string; // ISO string
  effectiveUntil: string; // ISO string or null
  archived: boolean;

  warnings: {
    legal?: string;
    timeSensitive?: string;
    campusSpecific?: string;
  };

  embedding: number[];
};

export type CreateRagDocChunkOptions = {
  traceId?: string;
};

export async function createRagDocChunk(
  parameters: CreateRagDocChunkParameters,
  options: CreateRagDocChunkOptions = {},
): Promise<void> {
  const startTime = performance.now();

  const client = ChromaService.getInstance().getClient();

  const collection = await client.getOrCreateCollection({
    name: "rag-documents",
    embeddingFunction: OllamaEmbeddingService.getInstance().getEmbedder(),
  });

  const {
    docId,
    content,
    archived,
    effectiveUntil,
    effectiveFrom,
    warnings,
    category,
    authorityLevel,
    campuses,
    deliveryModes,
    embedding,
    chunkIndex,
  } = parameters;

  await collection.add({
    ids: [`${docId}:${chunkIndex}`],
    embeddings: [embedding],
    documents: [content],
    metadatas: [
      {
        archived,
        effectiveUntil,
        effectiveFrom,
        warnings: JSON.stringify(warnings || {}), // We store it this way because we dont use it for "fetching"
        authorityLevel,
        content: "", // We remove content from metadata to save space

        // Array values as booleans for compatibility with Chroma indexing
        campuses_choluteca: campuses.includes("CHOLUTECA"),
        campuses_comayagua: campuses.includes("COMAYAGUA"),
        campuses_danli: campuses.includes("DANLI"),
        campuses_global: campuses.includes("GLOBAL"),
        campuses_la_ceiba: campuses.includes("LA CEIBA"),
        campuses_laceiba: campuses.includes("LA CEIBA"),
        campuses_sanpedro: campuses.includes("SANPEDRO"),
        campuses_santarosa: campuses.includes("SANTA ROSA"),
        campuses_tegucigalpa: campuses.includes("TEGUCIGALPA"),

        // Array values as booleans for compatibility with Chroma indexing
        deliveryModes_hybrid: deliveryModes.includes("hybrid"),
        deliveryModes_online: deliveryModes.includes("online"),
        deliveryModes_onsite: deliveryModes.includes("onsite"),
      } as Partial<IRAGChunk>,
    ],
  });

  LoggingService.log({
    source: "services:chroma:rag-doc-chunks:create",
    level: "important",
    traceId: options.traceId,
    message: "RAG document chunk created",
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      docId,
      chunkIndex,
      category,
    },
    metadata: {
      createdAt: new Date(),
    },
  });
}

export async function createRagDocChunkWithRetry(
  parameters: CreateRagDocChunkParameters,
  options: CreateRagDocChunkOptions = {},
): Promise<void> {
  return retry(
    async (_, attempt) => {
      const startTime = performance.now();
      try {
        return await createRagDocChunk(parameters, options);
      } catch (error: any) {
        LoggingService.log({
          source: "services:chroma:rag-doc-chunks:create:retry",
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
