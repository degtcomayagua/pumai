import { ChromaClient } from "chromadb";

class ChromaService {
  private client: ChromaClient;

  private static instance: ChromaService | null = null;

  public static getInstance() {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService();
    }
    return ChromaService.instance;
  }

  private constructor() {
    this.client = new ChromaClient({
      host: process.env.CHROMA_DB_HOST || "localhost",
      port: process.env.CHROMA_DB_PORT
        ? parseInt(process.env.CHROMA_DB_PORT, 10)
        : 8000,
      ssl: process.env.CHROMA_DB_SSL === "true",
    });

    const something = this.client.heartbeat().catch((err) => {
      console.error("ChromaDB connection error:", err.message);
    });

    something.then(() => {
      console.log("ChromaDB connected successfully");
    });

    // Clear the current collection on startup for testing purposes (TODO: Remove this in production) 
    // this.deleteCollection().then(() => {
    //   console.log("ChromaDB collection cleared");
    // }).catch((err) => {
    //   console.error("Error clearing ChromaDB collection:", err.message);
    // });
  }

  public async init() {}

  public getClient() {
    return this.client;
  }

  public async deleteCollection() {
    return this.client.deleteCollection({ name: "rag-documents" });
  }
}

export default ChromaService;
