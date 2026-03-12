import { IMetadata } from "./metadata";

import {
  DocumentCategory,
  DeliveryMode,
  CampusCode,
  SourceType,
} from "./index";

export interface IRAGDocument {
  _id: string; // database internal ID
  title: string;
  category: DocumentCategory;

  authorityLevel: number; // higher = stronger authority
  sourceType: SourceType;

  campuses: CampusCode[]; // ["GLOBAL"] or specific campuses
  deliveryModes: DeliveryMode[];

  effectiveFrom: Date;
  effectiveUntil: Date | null;
  archived: boolean;

  warnings: {
    legal?: string;
    timeSensitive?: string;
    campusSpecific?: string;
  };

  summary: string; // auto-generated
  tags: string[];

  metadata: IMetadata;
}
