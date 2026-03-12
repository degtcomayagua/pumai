import mongoose from "mongoose";

import { IMetadata } from "../../../shared/models/metadata";

const metadataSchema = new mongoose.Schema<IMetadata>(
  {
    documentVersion: { type: Number, required: true, default: 1 },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },

    updatedAt: { type: Date, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    updateHistory: [
      {
        updatedAt: { type: Date, required: true },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          required: false,
        },
        changes: { type: mongoose.Schema.Types.Mixed, required: true },
      },
    ],

    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    source: { type: String, enum: ["manual", "imported"], default: "manual" },
    notes: { type: String, default: "" },
    tags: [{ type: String }],
  },
  {
    id: false,
  },
);

export default metadataSchema;
