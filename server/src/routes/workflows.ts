import express, { RequestHandler } from "express";

import createHandler from "../controllers/workflows/create.js";
import updateHandler from "../controllers/workflows/update.js";
import deleteHandler from "../controllers/workflows/delete.js";
import getHandler from "../controllers/workflows/get.js";
import listHandler from "../controllers/workflows/list.js";
import restoreHandler from "../controllers/workflows/restore.js";
import availableHandler from "../controllers/workflows/available.js";
import startHandler from "../controllers/workflows/start.js";
import clearSessionHandler from "../controllers/workflows/clear-session.js";

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
  startSchema,
  clearSessionSchema,
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

// Public: available registered workflows for selection
router.get("/available", availableHandler);

// Start a workflow (create session + execute first step)
router.post("/start", validateRequestBody(startSchema), startHandler);

// Clear a workflow session (cancel)
router.post(
  "/clear-session",
  validateRequestBody(clearSessionSchema),
  clearSessionHandler,
);

// List roles
router.post("/list", validateRequestBody(listSchema), listHandler);

export default router;
