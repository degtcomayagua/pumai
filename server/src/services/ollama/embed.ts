import { EmbedRequest, Ollama } from "ollama";

import OllamaClient from "./client.js";
import {
  queryRagDocumentsByEmbedding,
  RagQueryFilters,
} from "../qdrant/rag-documents/query.js";
import { RagQueryResult } from "../qdrant/rag-documents/shared.js";

class OllamaEmbeddingClient {
  private static instance: OllamaEmbeddingClient | null = null;
  private client: Ollama = OllamaClient.getInstance().getClient();

  public static getInstance() {
    if (!OllamaEmbeddingClient.instance)
      OllamaEmbeddingClient.instance = new OllamaEmbeddingClient();
    return OllamaEmbeddingClient.instance;
  }

  constructor() {
  }

  private resolveEmbeddingModel() {
    return process.env.OLLAMA_EMBEDDING_MODEL || "embeddinggemma:latest";
  }

  public async embedText(
    text: string,
    options?: EmbedRequest,
  ): Promise<number[]> {
    const response = await this.client.embed({
      model: this.resolveEmbeddingModel(),
      input: text,
      ...options,
    });

    const embedding = response.embeddings[0];

    if (!embedding) {
      throw new Error("Ollama returned an empty embedding response.");
    }

    return embedding;
  }

  async getContext(
    prompt: string,
    nResults = 3,
    filters?: RagQueryFilters,
  ): Promise<RagQueryResult> {
    const queryEmbedding = await this.embedText(prompt);

    return queryRagDocumentsByEmbedding(queryEmbedding, {
      nResults,
      filters,
    });
  }
}

export default OllamaEmbeddingClient;
