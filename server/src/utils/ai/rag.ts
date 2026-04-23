import { Message, Tool } from "ollama";

import { CampusCode, DeliveryMode, DocumentCategory } from "../../../../shared/models";

import OllamaChatService from "../../services/ollama/chat";
import OllamaEmbeddingService from "../../services/ollama/embed";
import { queryRagDocumentsByEmbedding } from "../../services/qdrant/rag-documents/query";
import { RagQueryFilters } from "../../services/qdrant/rag-documents/shared"

import { MCPServerConfig } from "../../types/mcp";

export type AiRequestBody = {
  prompt: string;
  workflowSessionId?: string;
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
  ragDocuments?: Awaited<ReturnType<typeof queryRagDocumentsByEmbedding>>;
};

export function buildAiFilters(request: AiRequestBody): RagQueryFilters {
  return {
    campuses: request.campuses,
    deliveryModes: request.deliveryModes,
    category: request.category,
    includeArchived: false,
  };
}

export async function buildAiPrompt(prompt: string, options: {
  rag?: boolean;
} = {},
  ragFilters?: RagQueryFilters
): Promise<BuildAiPromptResult> {
  const queryEmbedding = await OllamaEmbeddingService.getInstance().embedText(prompt);

  if (options.rag === undefined || options.rag === false) {
    return {
      finalPrompt: OllamaChatService.getInstance().getFinalPrompt(
        "",
        prompt,
      ),
      ragDocuments: undefined,
    };
  }
  const ragDocuments = await queryRagDocumentsByEmbedding(queryEmbedding, {
    nResults: 3,
    filters: ragFilters,
  });

  const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
    ragDocuments.documents.join("\n"),
    prompt,
  );

  return {
    finalPrompt,
    ragDocuments,
  };
}
