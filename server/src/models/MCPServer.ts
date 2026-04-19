// models/MCPServer.ts
import mongoose from "mongoose";
import { IMCPServer } from "../../../shared/models/mcp-server";
import metadataSchema from "./Metadata";

const mcpServerAuthSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["none", "bearer", "api-key", "basic"],
      default: "none",
    },
    // bearer
    token: { type: String, default: undefined },
    // api-key
    headerName: { type: String, default: undefined },
    key: { type: String, default: undefined },
    // basic
    username: { type: String, default: undefined },
    password: { type: String, default: undefined },
  },
  { _id: false },
);

const mcpServerSchema = new mongoose.Schema<IMCPServer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    protocol: {
      type: String,
      required: true,
      enum: ["streamable-http", "sse"],
      default: "streamable-http",
    },
    isRestricted: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    allowedRoles: {
      type: [mongoose.Types.ObjectId],
      ref: "AccountRole",
      default: [],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    auth: {
      type: mcpServerAuthSchema,
      required: true,
      default: { type: "none" },
    },
    tags: {
      type: [String],
      default: [],
    },
    iconUrl: {
      type: String,
      default: undefined,
    },
    _references: {
      type: Map,
      of: String,
      default: undefined,
    },
    metadata: {
      type: metadataSchema,
      default: {},
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const MCPServerModel = mongoose.model<IMCPServer>("MCPServer", mcpServerSchema);

export default MCPServerModel;