import z from "zod";

import { generateSchema } from "../schemas/ai.js";

import { ResponseStatus } from "@shared/models/index.js";

export type GenerateRequestBody = z.infer<typeof generateSchema>;
export interface GenerateResponseData {
  status: ResponseStatus;
  result?: string;
  workflowSessionId?: string;
  workflow?: string;
  currentStep?: string;
}

export type StreamRequestBody = GenerateRequestBody;
export interface StreamResponseData {
  status: ResponseStatus;
  result?: string;
  workflowSessionId?: string;
  workflow?: string;
  currentStep?: string;
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
  | "system"
  | "done"
  | (string & {});

export type StreamChunk = {
  event: StreamChunkEvent;
  data: string;
};