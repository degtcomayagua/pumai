import express from "express";

import createHandler from "../controllers/accounts/create.js";
import getHandler from "../controllers/accounts/get.js";
import listHandler from "../controllers/accounts/list.js";
import updateHandler from "../controllers/accounts/update.js";
import deleteHandler from "../controllers/accounts/delete.js";
import restoreHandler from "../controllers/accounts/restore.js";

import { validateRequestBody } from "../middleware/validationMiddleware.js";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Import the schemas and types
import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
} from "@shared/schemas/accounts.js";

// Apply global middlewares
router.use(ensureAuthenticated);

// Routes with their schemas
router.post(
  "/create",
  ensurePermissions(["accounts:create"]),
  validateRequestBody(createSchema),
  createHandler,
);

router.post(
  "/update",
  ensurePermissions(["accounts:update"]),
  validateRequestBody(updateSchema),
  updateHandler,
);

router.post(
  "/delete",
  ensurePermissions(["accounts:delete"]),
  validateRequestBody(deleteSchema),
  deleteHandler,
);

router.post(
  "/restore",
  ensurePermissions(["accounts:restore"]),
  validateRequestBody(deleteSchema),
  restoreHandler,
);

router.post("/get", validateRequestBody(getSchema), getHandler);

router.post("/list", validateRequestBody(listSchema), listHandler);

export default router;
