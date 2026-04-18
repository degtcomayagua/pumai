import { Message, Tool } from "ollama";

import { CampusCode, DeliveryMode, DocumentCategory } from "../../../shared/models";

import OllamaChatService from "../services/ollama/chat";
import OllamaEmbeddingService from "../services/ollama/embed";
import { queryRagDocumentsByEmbedding } from "../services/qdrant/rag-documents/query";

import { MCPServerConfig } from "./ai-mcp";

export type AiRequestBody = {
  prompt: string;
  chat: Message[];
  campuses: CampusCode[];
  deliveryModes: DeliveryMode[];
  category?: DocumentCategory;
  tools?: Tool[];
  mcpServers?: MCPServerConfig[];
};

export type AiResponseData = {
  status: "success" | "internal-error";
  result?: string;
};

export type BuildAiPromptResult = {
  finalPrompt: string;
  ragDocuments: Awaited<ReturnType<typeof queryRagDocumentsByEmbedding>>;
};

export function buildAiFilters(request: AiRequestBody) {
  return {
    campuses: request.campuses,
    deliveryModes: request.deliveryModes,
    category: request.category,
    includeArchived: false,
  };
}

export async function buildAiPrompt(request: AiRequestBody): Promise<BuildAiPromptResult> {
  const queryEmbedding = await OllamaEmbeddingService.getInstance().embedText(request.prompt);

  const ragDocuments = await queryRagDocumentsByEmbedding(queryEmbedding, {
    nResults: 3,
    filters: buildAiFilters(request),
  });

  const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
    ragDocuments.documents.join("\n"),
    request.prompt,
  );

  return {
    finalPrompt,
    ragDocuments,
  };
}
