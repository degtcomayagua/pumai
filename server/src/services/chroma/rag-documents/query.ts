import { Metadata, QueryResult } from "chromadb";

import ChromaService from "../../chroma";
import OllamaEmbeddingService from "../../ollama/embed";
import {
  CampusCode,
  DeliveryMode,
  DocumentCategory,
} from "../../../../../shared/models";

export const RAG_DOC_CHUNKS_COLLECTION = "rag-documents";

export type RagQueryFilters = {
  campuses?: CampusCode[];
  deliveryModes?: DeliveryMode[];
  category?: DocumentCategory;
  includeArchived?: boolean;
  effectiveAt?: Date;
};

type ChromaWhere = Record<string, unknown>;

const CAMPUS_METADATA_KEYS: Record<CampusCode, string> = {
  COMAYAGUA: "campuses_comayagua",
  TEGUCIGALPA: "campuses_tegucigalpa",
  SANPEDRO: "campuses_sanpedro",
  CHOLUTECA: "campuses_choluteca",
  "LA CEIBA": "campuses_laceiba",
  DANLI: "campuses_danli",
  "SANTA ROSA": "campuses_santarosa",
  GLOBAL: "campuses_global",
};

const DELIVERY_MODE_METADATA_KEYS: Record<DeliveryMode, string> = {
  onsite: "deliveryModes_onsite",
  online: "deliveryModes_online",
  hybrid: "deliveryModes_hybrid",
};

export function buildRagWhereFilter(
  filters: RagQueryFilters = {},
): ChromaWhere | undefined {
  const clauses: ChromaWhere[] = [];
  const effectiveAt = (filters.effectiveAt ?? new Date()).toISOString();

  if (!filters.includeArchived) {
    clauses.push({ archived: false });
  }

  if (filters.category) {
    clauses.push({ category: filters.category });
  }

  if (filters.campuses?.length) {
    const campusClauses = new Set<string>();

    for (const campus of filters.campuses) {
      campusClauses.add(CAMPUS_METADATA_KEYS[campus]);
    }

    if (!filters.campuses.includes("GLOBAL")) {
      campusClauses.add("campuses_global");
    }

    clauses.push({
      $or: Array.from(campusClauses).map((metadataKey) => ({
        [metadataKey]: true,
      })),
    });
  }

  if (filters.deliveryModes?.length) {
    clauses.push({
      $or: filters.deliveryModes.map((mode) => ({
        [DELIVERY_MODE_METADATA_KEYS[mode]]: true,
      })),
    });
  }

  // clauses.push({ effectiveFrom: { $lte: effectiveAt } });
  // clauses.push({
  //   $or: [
  //     { effectiveUntil: { $gte: effectiveAt } },
  //     { effectiveUntil: null },
  //     { effectiveUntil: "" },
  //   ],
  // });

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { $and: clauses };
}

export async function queryRagDocumentsByEmbedding(
  queryEmbedding: number[],
  options: {
    nResults?: number;
    filters?: RagQueryFilters;
  } = {},
): Promise<QueryResult<Metadata>> {
  const collection = await ChromaService.getInstance()
    .getClient()
    .getOrCreateCollection({
      name: RAG_DOC_CHUNKS_COLLECTION,
      embeddingFunction: OllamaEmbeddingService.getInstance().getEmbedder(),
    });

  const where = buildRagWhereFilter(options.filters);

  return collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: options.nResults ?? 3,
    where: where as any,
  });
}

export async function deleteRagChunksByDocId(docId: string): Promise<void> {
  const collection = await ChromaService.getInstance()
    .getClient()
    .getOrCreateCollection({
      name: RAG_DOC_CHUNKS_COLLECTION,
      embeddingFunction: OllamaEmbeddingService.getInstance().getEmbedder(),
    });

  await collection.delete({
    where: {
      docId,
    },
  });
}
