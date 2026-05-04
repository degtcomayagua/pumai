import express, { RequestHandler } from "express";

import createHandler from "../controllers/workflows/create.js";
import updateHandler from "../controllers/workflows/update.js";
import deleteHandler from "../controllers/workflows/delete.js";
import getHandler from "../controllers/workflows/get.js";
import listHandler from "../controllers/workflows/list.js";
import restoreHandler from "../controllers/workflows/restore.js";

const router = express.Router();

import { validateRequestBody } from "../middleware/validationMiddleware.js";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware.js";

// Schemas
import {
  createSchema,
  listSchema,
  getSchema,
  deleteSchema,
  restoreSchema,
  updateSchema,
} from "@shared/schemas/workflows.js";

// Apply global auth middleware
router.use(ensureAuthenticated);

// Routes
// Create role
router.post(
  "/create",
  ensurePermissions(["workflows:create"]),
  validateRequestBody(createSchema),
  createHandler,
);

// Update role
router.post(
  "/update",
  ensurePermissions(["workflows:update"]),
  validateRequestBody(updateSchema),
  updateHandler,
);

// Delete role
router.post(
  "/delete",
  ensurePermissions(["workflows:delete"]),
  validateRequestBody(deleteSchema),
  deleteHandler,
);

// Restore role
router.post(
  "/restore",
  ensurePermissions(["workflows:restore"]),
  validateRequestBody(restoreSchema),
  restoreHandler,
);

// Get workflow(s)
router.post("/get", validateRequestBody(getSchema), getHandler);

// List roles
router.post("/list", validateRequestBody(listSchema), listHandler);

export default router;

