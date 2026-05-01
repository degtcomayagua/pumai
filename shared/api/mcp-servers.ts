import type { IMCPServer } from "../models/mcp-server";
import { ResponseStatus } from ".";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  restoreSchema,
} from "../schemas/mcp-servers";

// Inferred request body types
export type GetRequestBody = z.infer<typeof getSchema>;
export type CreateRequestBody = z.infer<typeof createSchema>;
export type DeleteRequestBody = z.infer<typeof deleteSchema>;
export type RestoreRequestBody = z.infer<typeof restoreSchema>;
export type UpdateRequestBody = z.infer<typeof updateSchema>;
export type ListRequestBody = z.infer<typeof listSchema>;

// Response types
export interface GetResponseData {
  status: ResponseStatus;
  mcpServers?: IMCPServer[];
}

export interface ListResponseData {
  status: ResponseStatus;
  mcpServers?: IMCPServer[];
  totalMcpServers?: number;
}

export interface CreateResponseData {
  status: ResponseStatus;
  mcpServer?: IMCPServer;
}

export interface UpdateResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: IMCPServer;
}

export interface DeleteResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: IMCPServer;
}

export interface RestoreResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: IMCPServer;
}