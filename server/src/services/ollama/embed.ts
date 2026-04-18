import { EmbedRequest, Ollama } from "ollama";
import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import { Metadata, QueryResult } from "chromadb";

import OllamaClient from "./client";
import {
  queryRagDocumentsByEmbedding,
  RagQueryFilters,
} from "../chroma/rag-documents/query";

class OllamaEmbeddingClient {
  private static instance: OllamaEmbeddingClient | null = null;
  private embedder: OllamaEmbeddingFunction;
  private client: Ollama = OllamaClient.getInstance().getClient();

  public static getInstance() {
    if (!OllamaEmbeddingClient.instance)
      OllamaEmbeddingClient.instance = new OllamaEmbeddingClient();
    return OllamaEmbeddingClient.instance;
  }

  constructor() {
    const host = process.env.OLLAMA_URL?.trim() || "http://localhost:11434";

    this.embedder = new OllamaEmbeddingFunction({
      url: host,
      model: this.resolveEmbeddingModel(),
    });
  }

  private resolveEmbeddingModel() {
    return process.env.OLLAMA_EMBEDDING_MODEL || "embeddinggemma:latest";
  }

  public getEmbedder() {
    return this.embedder;
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
  ): Promise<QueryResult<Metadata>> {
    const queryEmbedding = await this.embedText(prompt);

    return queryRagDocumentsByEmbedding(queryEmbedding, {
      nResults,
      filters,
    });
  }
}

export default OllamaEmbeddingClient;
