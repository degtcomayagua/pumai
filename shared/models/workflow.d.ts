import { IMetadata } from "../schemas/metadata";
import { IAccountRole } from "./account-role";

export type WorkflowAuthType = "none" | "bearer" | "api-key" | "basic";

export type IWorkflowAuth =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "api-key"; headerName: string; key: string }
  | { type: "basic"; username: string; password: string };

export type WorkflowType = "n8n" | "custom"; // We are only using n8n for now, but we can add more types in the future if needed

export type IWorkflow = {
  _id: string; // database internal ID
  name: string;
  description: string;
  url: string;
  protocol: "webhook" | "websocket";
  type: WorkflowType;

  isRestricted: boolean;
  allowedRoles: mongoose.Types.ObjectId[] | IAccountRole[]; // Empty if not restricted

  isActive: boolean;

  auth: IWorkflowAuth;
  tags?: string[];
  iconUrl?: string;

  metadata: IMetadata;
};