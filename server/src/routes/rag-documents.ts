import express, { RequestHandler } from "express";

import listHandler from "../controllers/rag-documents/list";
// import getHandler from "../controllers/rag-documents/get";
import createHandler from "../controllers/rag-documents/create";

const router = express.Router();
import { validateRequestBody } from "../middleware/validationMiddleware";

// Schemas
import {
  createSchema,
  listSchema,
  getSchema,
} from "../../../shared/schemas/rag-documents";

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
