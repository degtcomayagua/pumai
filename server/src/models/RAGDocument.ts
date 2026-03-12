import mongoose from "mongoose";
import { IRAGDocument } from "../../../shared/models/rag-document";
import metadataSchema from "./Metadata"; // reuse your existing metadata schema

const ragDocumentSchema = new mongoose.Schema<IRAGDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "regulation",
        "administrative",
        "campus_service",
        "student_life",
        "support",
      ],
      index: true,
    },
    authorityLevel: {
      type: Number,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: ["official", "approved_student"],
      index: true,
    },
    campuses: {
      type: [String],
      required: true,
      enum: [
        "COMAYAGUA",
        "TEGUCIGALPA",
        "SANPEDRO",
        "CHOLUTECA",
        "LA CEIBA",
        "DANLI",
        "SANTA ROSA",
        "GLOBAL",
      ],
      default: ["GLOBAL"],
    },
    deliveryModes: {
      type: [String],
      required: true,
      enum: ["onsite", "online", "hybrid"],
      default: [],
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    effectiveUntil: {
      type: Date,
      default: null,
      index: true,
    },
    archived: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    warnings: {
      legal: { type: String, default: undefined },
      timeSensitive: { type: String, default: undefined },
      campusSpecific: { type: String, default: undefined },
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: metadataSchema,
      default: {},
    },
  },
  {
    versionKey: false, // removes __v
    timestamps: true, // automatically adds createdAt and updatedAt
  },
);

const RAGDocumentModel = mongoose.model<IRAGDocument>(
  "RAGDocument",
  ragDocumentSchema,
);

export default RAGDocumentModel;
