import express from "express";

// Controllers
import createHandler from "../controllers/account-roles/create.js";
import updateHandler from "../controllers/account-roles/update.js";
import deleteHandler from "../controllers/account-roles/delete.js";
import getHandler from "../controllers/account-roles/get.js";
import listHandler from "../controllers/account-roles/list.js";
import restoreHandler from "../controllers/account-roles/restore.js";

// Middleware
import { validateRequestBody } from "../middleware/validationMiddleware.js";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware.js";

// Schemas
import {
  getSchema,
  createSchema,
  deleteSchema,
  listSchema,
  updateSchema,
  restoreSchema,
} from "@shared/schemas/account-roles.js";

const router = express.Router();

// Apply global auth middleware
router.use(ensureAuthenticated);

// Create role
router.post(
  "/create",
  ensurePermissions(["account-roles:create"]),
  validateRequestBody(createSchema),
  createHandler,
);

// Update role
router.post(
  "/update",
  ensurePermissions(["account-roles:update"]),
  validateRequestBody(updateSchema),
  updateHandler,
);

// Delete role
router.post(
  "/delete",
  ensurePermissions(["account-roles:delete"]),
  validateRequestBody(deleteSchema),
  deleteHandler,
);

// Restore role
router.post(
  "/restore",
  ensurePermissions(["account-roles:restore"]),
  validateRequestBody(restoreSchema),
  restoreHandler,
);

// Get role(s)
router.post("/get", validateRequestBody(getSchema), getHandler);

// List roles
router.post("/list", validateRequestBody(listSchema), listHandler);

export default router;
