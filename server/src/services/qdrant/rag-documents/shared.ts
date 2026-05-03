import {
  setupQdrant,
  RAG_DOC_CHUNKS_COLLECTION,
  RAG_CHUNK_VECTOR_SIZE,
} from "../../../config/qdrant.js";
import {
  CampusCode,
  DeliveryMode,
  DocumentCategory,
  SourceType,
} from "../../../../../generated/prisma/enums.js"

import { IRAGChunk } from "@shared/models/chroma/rag-chunk.js";

export const RAG_CHUNK_MAX_CONTENT_LENGTH = 1000;

export {
  RAG_DOC_CHUNKS_COLLECTION,
  RAG_CHUNK_VECTOR_SIZE,
} from "../../../config/qdrant.js";

export type RagWarnings = {
  legal?: string;
  timeSensitive?: string;
  campusSpecific?: string;
};

export type RagQueryFilters = {
  campuses?: CampusCode[];
  deliveryModes?: DeliveryMode[];
  category?: DocumentCategory;
  includeArchived?: boolean;
  effectiveAt?: Date;
};

export type RagChunkPayload = {
  docId: string;
  chunkIndex: number;
  content: string;
  sourceType: SourceType;
  category: DocumentCategory;
  authorityLevel: number;
  campuses: CampusCode[];
  deliveryModes: DeliveryMode[];
  effectiveFrom: string;
  effectiveUntil: string | null;
  archived: boolean;
  warnings: RagWarnings;
  campuses_comayagua: boolean;
  campuses_tegucigalpa: boolean;
  campuses_sanpedro: boolean;
  campuses_choluteca: boolean;
  campuses_laceiba: boolean;
  campuses_danli: boolean;
  campuses_santarosa: boolean;
  campuses_global: boolean;
  deliveryModes_onsite: boolean;
  deliveryModes_online: boolean;
  deliveryModes_hybrid: boolean;
};

export type RagQueryPoint = {
  id: string;
  score: number;
  payload: RagChunkPayload;
};

export type RagQueryResult = {
  ids: string[];
  documents: string[];
  metadatas: RagChunkPayload[];
  scores: number[];
  points: RagQueryPoint[];
};

export type UpdateRagDocChunksParameters = {
  docId: string;
  sourceType?: SourceType;
  category?: DocumentCategory;
  authorityLevel?: number;
  campuses?: CampusCode[];
  deliveryModes?: DeliveryMode[];
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  archived?: boolean;
  warnings?: RagWarnings;
};

export function getRagChunkId(docId: string, chunkIndex: number) {
  return `${docId}:${chunkIndex}`;
}

export async function getQdrantClient() {
  return setupQdrant();
}

function buildCampusFlags(campuses: CampusCode[]) {
  return {
    campuses_comayagua: campuses.includes("COMAYAGUA"),
    campuses_tegucigalpa: campuses.includes("TEGUCIGALPA"),
    campuses_sanpedro: campuses.includes("SANPEDRO"),
    campuses_choluteca: campuses.includes("CHOLUTECA"),
    campuses_laceiba: campuses.includes("LA_CEIBA"),
    campuses_danli: campuses.includes("DANLI"),
    campuses_santarosa: campuses.includes("SANTA_ROSA"),
  };
}

function buildDeliveryModeFlags(deliveryModes: DeliveryMode[]) {
  return {
    deliveryModes_onsite: deliveryModes.includes("onsite"),
    deliveryModes_online: deliveryModes.includes("online"),
    deliveryModes_hybrid: deliveryModes.includes("hybrid"),
  };
}


export function buildRagChunkPayloadPatch(
  parameters: UpdateRagDocChunksParameters,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (parameters.sourceType !== undefined) {
    payload.sourceType = parameters.sourceType;
  }

  if (parameters.category !== undefined) {
    payload.category = parameters.category;
  }

  if (parameters.authorityLevel !== undefined) {
    payload.authorityLevel = parameters.authorityLevel;
  }

  if (parameters.campuses !== undefined) {
    payload.campuses = parameters.campuses;
    Object.assign(payload, buildCampusFlags(parameters.campuses));
  }

  if (parameters.deliveryModes !== undefined) {
    payload.deliveryModes = parameters.deliveryModes;
    Object.assign(payload, buildDeliveryModeFlags(parameters.deliveryModes));
  }

  if (parameters.effectiveFrom !== undefined) {
    payload.effectiveFrom = parameters.effectiveFrom;
  }

  if (parameters.effectiveUntil !== undefined) {
    payload.effectiveUntil = parameters.effectiveUntil;
  }

  if (parameters.archived !== undefined) {
    payload.archived = parameters.archived;
  }

  if (parameters.warnings !== undefined) {
    payload.warnings = parameters.warnings;
  }

  return payload;
}

export function buildRagDocIdFilter(docId: string) {
  return {
    must: [
      {
        key: "docId",
        match: {
          value: docId,
        },
      },
    ],
  };
}

export function buildRagSearchFilter(filters: RagQueryFilters = {}) {
  const must: Record<string, unknown>[] = [];

  if (!filters.includeArchived) {
    must.push({
      key: "archived",
      match: {
        value: false,
      },
    });
  }

  if (filters.category) {
    must.push({
      key: "category",
      match: {
        value: filters.category,
      },
    });
  }

  if (must.length === 0) {
    return undefined;
  }

  return { must };
}

export function pointMatchesRagFilters(
  payload: Partial<RagChunkPayload> | undefined,
  filters: RagQueryFilters = {},
): boolean {
  if (!payload) {
    return false;
  }

  if (!filters.includeArchived && payload.archived) {
    return false;
  }

  if (filters.category && payload.category !== filters.category) {
    return false;
  }

  if (filters.effectiveAt) {
    const effectiveAt = filters.effectiveAt.getTime();
    const effectiveFrom = payload.effectiveFrom
      ? new Date(payload.effectiveFrom).getTime()
      : Number.NaN;
    const effectiveUntil = payload.effectiveUntil
      ? new Date(payload.effectiveUntil).getTime()
      : Number.NaN;

    if (Number.isFinite(effectiveFrom) && effectiveAt < effectiveFrom) {
      return false;
    }

    if (Number.isFinite(effectiveUntil) && effectiveAt > effectiveUntil) {
      return false;
    }
  }

  if (filters.campuses?.length) {
    const selectedCampuses = new Set(filters.campuses);
    const documentCampuses = payload.campuses ?? [];

    if (
      !documentCampuses.some((campus) => selectedCampuses.has(campus))
    ) {
      return false;
    }
  }

  if (filters.deliveryModes?.length) {
    const selectedDeliveryModes = new Set(filters.deliveryModes);
    const documentDeliveryModes = payload.deliveryModes ?? [];

    if (
      !documentDeliveryModes.some((mode) => selectedDeliveryModes.has(mode))
    ) {
      return false;
    }
  }

  return true;
}

export function normalizeRagChunkPoint(point: {
  id?: string | number;
  score?: number;
  payload?: Record<string, unknown> | null;
}): RagQueryPoint | null {
  if (!point.payload) {
    return null;
  }

  const payload = point.payload as RagChunkPayload;

  return {
    id: String(point.id ?? ""),
    score: Number(point.score ?? 0),
    payload,
  };
}