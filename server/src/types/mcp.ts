import { OllamaMcpServer } from "./ollama.js";

export type MCPServerProtocol = "streamable-http" | "sse";

export type MCPServerConfig = {
  name: string;
  description?: string;
  url: string;
  protocol?: MCPServerProtocol;
  enabled?: boolean;
};

export type MCPDiscoveryCacheValue = {
  expiresAt: number;
  value: OllamaMcpServer;
};

export type ResolvedMcpCatalog = {
  servers: OllamaMcpServer[];
  toolServerByName: Map<string, MCPServerConfig>;
};

export type ExecutedToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  serverName: string;
  result: string;
};