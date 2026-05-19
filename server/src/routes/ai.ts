import express, { RequestHandler } from "express";

// import generateHandler from "../controllers/ai/generate.js";
import streamHandler from "../controllers/ai/stream.js";

const router = express.Router();
import { validateRequestBody } from "../middleware/validationMiddleware.js";

// Schemas
import { generateSchema } from "@shared/schemas/ai.js";

// Routes
// router.post(
//   "/generate",
//   validateRequestBody(generateSchema),
//   generateHandler as RequestHandler,
// );

router.post(
  "/generate-stream",
  validateRequestBody(generateSchema),
  streamHandler as RequestHandler,
);

export default router;
