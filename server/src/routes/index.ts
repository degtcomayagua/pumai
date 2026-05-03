import type { Express } from "express";

// Import routers
// import StatusRouter from "./status";
import LogsRouter from "./logs.js";
import AIRouter from "./ai.js";
import AuthRouter from "./auth.js";
import AccountsRouter from "./accounts.js";
import AccountRolesRouter from "./account-roles.js";
import RAGDocumentsRouter from "./rag-documents.js";

export function registerRoutes(app: Express): void {
  app.use("/api/ai", AIRouter);
  app.use("/api/auth", AuthRouter);
  app.use("/api/logs", LogsRouter);
  app.use("/api/accounts", AccountsRouter);
  app.use("/api/account-roles", AccountRolesRouter);
  app.use("/api/rag-documents", RAGDocumentsRouter);
}
