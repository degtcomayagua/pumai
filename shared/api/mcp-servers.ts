import { MCPServer } from "../../generated/prisma/client.js";
import { ResponseStatus } from "./index.js";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  restoreSchema,
} from "../schemas/mcp-servers.js";

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
  mcpServers?: MCPServer[];
}

export interface ListResponseData {
  status: ResponseStatus;
  mcpServers?: MCPServer[];
  totalMcpServers?: number;
}

export interface CreateResponseData {
  status: ResponseStatus;
  mcpServer?: MCPServer;
}

export interface UpdateResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: MCPServer;
}

export interface DeleteResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: MCPServer;
}

export interface RestoreResponseData {
  status: ResponseStatus | "mcp-server-not-found";
  mcpServer?: MCPServer;
}