import express, { RequestHandler } from "express";

import generateHandler from "../controllers/ai/generate";
import streamHandler from "../controllers/ai/stream";

const router = express.Router();
import { validateRequestBody } from "../middleware/validationMiddleware";

// Schemas
import { generateSchema } from "../../../shared/schemas/ai";

// Routes
router.post(
  "/generate",
  validateRequestBody(generateSchema),
  generateHandler as RequestHandler,
);

router.post(
  "/generate-stream",
  validateRequestBody(generateSchema),
  streamHandler as RequestHandler,
);

export default router;
