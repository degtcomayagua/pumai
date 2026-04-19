// types/mcp-server.ts
import mongoose from "mongoose";
import { IMetadata } from "../schemas/metadata";
import { IAccountRole } from "./account-role";

export type MCPAuthType = "none" | "bearer" | "api-key" | "basic";

export type IMCPServerAuth =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "api-key"; headerName: string; key: string }
  | { type: "basic"; username: string; password: string };

export type IMCPServer = {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  url: string;
  protocol: "streamable-http" | "sse";

  isRestricted: boolean;
  allowedRoles: mongoose.Types.ObjectId[] | IAccountRole[]; // Empty if not restricted

  isActive: boolean;

  auth: IMCPServerAuth;
  tags?: string[];
  iconUrl?: string;

  _references?: Record<string, string>;
  metadata: IMetadata;
};