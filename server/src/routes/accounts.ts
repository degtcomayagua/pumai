import express from "express";

import createHandler from "../controllers/accounts/create";
import getHandler from "../controllers/accounts/get";
import listHandler from "../controllers/accounts/list";
import updateHandler from "../controllers/accounts/update";
import deleteHandler from "../controllers/accounts/delete";
import restoreHandler from "../controllers/accounts/restore";

import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware";

const router = express.Router();

// Import the schemas and types
import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
} from "../../../shared/schemas/accounts";

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
