import express from "express";

import getHandler from "../controllers/logs/get";
import listHandler from "../controllers/logs/list";

import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware";
import { getSchema, listSchema } from "../../../shared/schemas/logs";

const router = express.Router();

router.use(ensureAuthenticated);

router.post(
  "/list",
  ensurePermissions(["logs:read"]),
  validateRequestBody(listSchema),
  listHandler,
);

router.post(
  "/get",
  ensurePermissions(["logs:read"]),
  validateRequestBody(getSchema),
  getHandler,
);

export default router;
