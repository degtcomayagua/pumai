import {
  DocumentCategory,
  DeliveryMode,
  CampusCode,
  SourceType,
} from "../index";

export interface IRAGChunk {
  docId: string; // Reference to MongoDB _id of the parent document

  // General chunk info
  chunkIndex: number;
  content: string;

  // For filtering
  category: DocumentCategory;
  authorityLevel: number; // higher = stronger authority
  sourceType: SourceType;
  campuses: CampusCode[]; // ["GLOBAL"] or specific campuses
  deliveryModes: DeliveryMode[];

  // Dates
  effectiveFrom: Date;
  effectiveUntil: Date | null;

  // Warnings and extra notes that will be mentioned when this exact document is retrieved in a query
  warnings: {
    legal?: string;
    timeSensitive?: string;
    campusSpecific?: string;
  };

  archived: boolean;
}

