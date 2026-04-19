import "module-alias/register";
import "./types";

import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookie from "cookie-parser";
import path from "path";

import { loadEnv } from "./config/env";
import MongoDBClient from "./config/mongodb";
import { setupQdrant } from "./config/qdrant";
import { setupRedis } from "./config/redis";

import { registerRoutes } from "./routes";

import SessionsService from "./services/sessions";

import { traceIdMiddleware } from "./middleware/traceId";
import { sanitizeBody } from "./middleware/sanitizeBody";

import SocketServer from "./services/socket";

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
  app.use(sanitizeBody);
  app.use("/uploads/", express.static(path.join(__dirname, "../uploads")));

  if (dev) {
    app.use(
      cors({
        origin: process.env.FRONT_END_ORIGIN,
        credentials: true,
        exposedHeaders: ["set-cookie"],
      }),
    );
  } else {
    const clientPath = path.join(__dirname, "../../client-dist");
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);

          if (new URL(origin).hostname.endsWith(".asterki.xyz")) {
            return callback(null, true);
          }

          return callback(null, true);
        },

        credentials: true,
        exposedHeaders: ["set-cookie"],
      }),
    );
    app.use(express.static(clientPath));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  const sessions = SessionsService.prototype.getInstance();
  sessions.loadToServer(app);

  registerRoutes(app);

  await setupRedis();
  new MongoDBClient(process.env.MONGODB_URI!).connect();
  await setupQdrant();

  httpServer.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });

  const socketServer = SocketServer.getInstance();
  socketServer.loadToServer(httpServer);
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[Server] Failed to start server:", error);
    process.exit(1);
  });
}
