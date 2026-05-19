import "./types/index.js";

import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookie from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { loadEnv } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { traceIdMiddleware } from "./middleware/traceId.js";
import SessionsService from "./services/sessions.js";
import SocketServer from "./services/socket.js";

export async function startServer() {
  loadEnv();

  const dev = process.env.NODE_ENV !== "production";
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  const app = express();
  const httpServer = createServer(app);

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(cookie(process.env.SESSION_SECRET as string));
  app.use(traceIdMiddleware);
  app.use("/uploads/", express.static(path.join(__dirname, "../uploads")));

  if (dev) {
    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
        credentials: true,
        exposedHeaders: ["set-cookie"],
      }),
    );
  } else {
    const clientPath = path.join(__dirname, "../../client-dist");
    app.use(express.static(clientPath));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  const sessions = SessionsService.prototype.getInstance();
  sessions.loadToServer(app);

  registerRoutes(app);
  httpServer.listen(port, () => {
    console.log(`[SERVER] Listening on port ${port}`);
  });

  const socketServer = SocketServer.getInstance();
  socketServer.loadToServer(httpServer);
}

startServer().catch((error) => {
  console.error("[SERVER] Failed to start server:", error);
  process.exit(1);
});
