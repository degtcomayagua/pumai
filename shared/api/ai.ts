import { Message, Tool } from "ollama";

import { ResponseStatus } from "../models";

export type MCPServerProtocol = "streamable-http" | "sse";

export type MCPServerConfig = {
  name: string;
  description?: string;
  url: string;
  protocol?: MCPServerProtocol;
  enabled?: boolean;
};

export type GenerateRequestBody = {
  prompt: string;
  chat: Message[];
  campuses: Array<
    | "COMAYAGUA"
    | "TEGUCIGALPA"
    | "SANPEDRO"
    | "CHOLUTECA"
    | "LA CEIBA"
    | "DANLI"
    | "SANTA ROSA"
    | "GLOBAL"
  >;
  deliveryModes: Array<"onsite" | "online" | "hybrid">;
  category?:
  | "regulation"
  | "administrative"
  | "campus_service"
  | "student_life"
  | "support";
  tools?: Tool[];
  mcpServers?: MCPServerConfig[];
};
export type StreamRequestBody = GenerateRequestBody;

// Response types
export interface GenerateResponseData {
  status: ResponseStatus;
  result?: string;
}

export interface StreamResponseData {
  status: ResponseStatus;
  result?: string;
}

export type GenerateStreamOptions = {
  onChunk?: (chunk: string, fullText: string) => void;
  signal?: AbortSignal;
};
