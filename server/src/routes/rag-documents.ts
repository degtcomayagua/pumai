import express, { RequestHandler } from "express";

import listHandler from "../controllers/rag-documents/list.js";
// import getHandler from "../controllers/rag-documents/get";
import createHandler from "../controllers/rag-documents/create.js";

const router = express.Router();
import { validateRequestBody } from "../middleware/validationMiddleware.js";

// Schemas
import {
  createSchema,
  listSchema,
  getSchema,
} from "@shared/schemas/rag-documents.js";

// Routes
router.post(
  "/create",
  validateRequestBody(createSchema),
  createHandler as RequestHandler,
);

router.post(
  "/list",
  validateRequestBody(listSchema),
  listHandler as RequestHandler,
);

// router.post(
//   "/get",
//   validateRequestBody(getSchema),
//   getHandler as RequestHandler,
// );

export default router;
