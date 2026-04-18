import { Ollama } from "ollama";

class OllamaClient {
  private static instance: OllamaClient | null = null;
  private client: Ollama;

  public static getInstance() {
    if (!OllamaClient.instance) OllamaClient.instance = new OllamaClient();
    return OllamaClient.instance;
  }

  constructor() {
    const host = process.env.OLLAMA_URL?.trim() || "http://localhost:11434";
    const headers = process.env.OLLAMA_API_KEY
      ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
      : undefined;

    this.client = new Ollama({
      host,
      headers,
    });
  }

  public getClient() {
    return this.client;
  }
}

export default OllamaClient;
