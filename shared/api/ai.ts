import z from "zod";

import { generateSchema } from "../schemas/ai.js";

import { ResponseStatus } from "../models/index.js";

export type GenerateRequestBody = z.infer<typeof generateSchema>;
export interface GenerateResponseData {
  status: ResponseStatus;
  result?: string;
}

export type StreamRequestBody = GenerateRequestBody;
export interface StreamResponseData {
  status: ResponseStatus;
  result?: string;
}
export type GenerateStreamOptions = {
  onChunk?: (chunk: StreamChunk, fullText: string) => void;
  signal?: AbortSignal;
};

export type StreamChunkEvent =
  | "text"
  | "tool_call"
  | "workflow_start"
  | "workflow_step"
  | "image"
  | "error"
  | "url"
  | "separator"
  | "workflow_end"
  | "system"
  | "done"
  | (string & {});

export type StreamChunk = {
  event: StreamChunkEvent;
  data: string;
};
