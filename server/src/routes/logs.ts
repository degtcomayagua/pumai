import express from "express";

import queryHandler from "../controllers/logs/query";
import exportHandler from "../controllers/logs/export";

import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware";
import { exportSchema, querySchema } from "../../../shared/schemas/logs";



const router = express.Router();

router.use(ensureAuthenticated);

// Query logs
router.post(
  "/query",
  ensurePermissions(["logs:read"]),
  validateRequestBody(querySchema),
  queryHandler,
);

// Export logs as CSV
router.post(
  "/export",
  ensurePermissions(["logs:export"]),
  validateRequestBody(exportSchema),
  exportHandler,
);

export default router;
