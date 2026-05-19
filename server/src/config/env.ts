import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv() {
  const envPath = path.resolve(
    __dirname,
    process.env.NODE_ENV === "production" ? "../.env.prod" : "../.env.dev",
  );

  dotenv.config({ path: envPath });


  const requiredEnv = [
    "OLLAMA_URL",
    "OLLAMA_MODEL",
    "OLLAMA_EMBEDDING_MODEL",

    "DATABASE_URL",
    "REDIS_URL",

    "QDRANT_URI",
    "QDRANT_RAG_DOCS_COLLECTION",

    "SESSION_SECRET",
    "PORT"
  ];

  console.log("[ENV] Loaded variables:", requiredEnv.join(", "));
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "[ENV ERROR] Missing required variables:",
      missing.join(", "),
    );
    process.exit(1);
  }
}
