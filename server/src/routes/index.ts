import type { Express } from "express";

// Import routers
// import StatusRouter from "./status";
import LogsRouter from "./logs";
import AIRouter from "./ai";
import AuthRouter from "./auth";
import AccountsRouter from "./accounts";
import AccountRolesRouter from "./account-roles";
import RAGDocumentsRouter from "./rag-documents";

export function registerRoutes(app: Express): void {
  app.use("/api/ai", AIRouter);
  app.use("/api/auth", AuthRouter);
  app.use("/api/logs", LogsRouter);
  app.use("/api/accounts", AccountsRouter);
  app.use("/api/account-roles", AccountRolesRouter);
  app.use("/api/rag-documents", RAGDocumentsRouter);
}
