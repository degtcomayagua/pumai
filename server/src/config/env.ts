import dotenv from "dotenv";
import path from "path";

export function loadEnv() {
  const baseEnv = ".env";
  const envFile =
    process.env.NODE_ENV === "production" ? "../.env.prod" : "../.env.dev";

  console.log(envFile, path.resolve(process.cwd(), envFile))

  const requiredEnv = [
    "OLLAMA_URL",
    "OLLAMA_MODEL",
    "OLLAMA_EMBEDDING_MODEL",

    "DATABASE_URL",
    "REDIS_URL",

    "QDRANT_URI",
    "QDRANT_RAG_DOCS_COLLECTION",

    "ALLOWED_ORIGINS",
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
