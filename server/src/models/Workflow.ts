import mongoose from "mongoose";
import { IWorkflow } from "../../../shared/models/workflow";
import metadataSchema from "./Metadata";

const workflowAuthSchema = new mongoose.Schema(
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

const workflowSchema = new mongoose.Schema<IWorkflow>(
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
      enum: ["webhook", "websocket"],
      default: "webhook",
    },
    type: {
      type: String,
      required: true,
      enum: ["n8n", "custom"],
      default: "n8n",
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
      type: workflowAuthSchema,
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

const WorkflowModel = mongoose.model<IWorkflow>("Workflow", workflowSchema);

export default WorkflowModel;