import express, { RequestHandler } from "express";

import createHandler from "../controllers/mcp-servers/create.js";
import updateHandler from "../controllers/mcp-servers/update.js";
import deleteHandler from "../controllers/mcp-servers/delete.js";
import getHandler from "../controllers/mcp-servers/get.js";
import listHandler from "../controllers/mcp-servers/list.js";
import restoreHandler from "../controllers/mcp-servers/restore.js";

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
} from "@shared/schemas/mcp-servers.js";

// Apply global auth middleware
router.use(ensureAuthenticated);

// Routes
// Create role
router.post(
  "/create",
  ensurePermissions(["mcp-servers:create"]),
  validateRequestBody(createSchema),
  createHandler,
);

// Update role
router.post(
  "/update",
  ensurePermissions(["mcp-servers:update"]),
  validateRequestBody(updateSchema),
  updateHandler,
);

// Delete role
router.post(
  "/delete",
  ensurePermissions(["mcp-servers:delete"]),
  validateRequestBody(deleteSchema),
  deleteHandler,
);

// Restore role
router.post(
  "/restore",
  ensurePermissions(["mcp-servers:restore"]),
  validateRequestBody(restoreSchema),
  restoreHandler,
);

// Get role(s)
router.post("/get", validateRequestBody(getSchema), getHandler);

// List roles
router.post("/list", validateRequestBody(listSchema), listHandler);

export default router;
