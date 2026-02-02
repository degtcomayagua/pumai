import {
  CampusCode,
  DocumentCategory,
  DeliveryMode,
  SourceType,
} from "../index";

export interface IRAGChunk {
  chunkId: string; // deterministic: `${docId}:${chunkIndex}`
  chunkIndex: number; // Several chunks for the same document
  docId: string; // Original document docId

  content: string;

  category: DocumentCategory;
  authorityLevel: number;

  effectiveFrom: string; // ISO string
  effectiveUntil: string; // ISO string or null
  archived: boolean;

  warnings: string; // JSON stringified

  // Filtering
  // Campuses (since chroma doesnt accept array)
  campuses_comayagua: boolean;
  campuses_tegucigalpa: boolean;
  campuses_sanpedro: boolean;
  campuses_choluteca: boolean;
  campuses_laceiba: boolean;
  campuses_danli: boolean;
  campuses_santarosa: boolean;
  campuses_global: boolean;

  // Delivery modes (since chroma doesnt accept array)
  deliveryModes_onsite: boolean;
  deliveryModes_online: boolean;
  deliveryModes_hybrid: boolean;
}
