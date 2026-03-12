import express from "express";

import updateConfig from "../controllers/config/update";
import getConfig from "../controllers/config/get";

import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware";

import { updateConfigSchema } from "../../../shared/schemas/config";

const router = express.Router();

// Route to get the configuration
router.get("/", getConfig);

router.post(
  "/update",
  [
    ensureAuthenticated,
    ensurePermissions(["config:update"]),
    validateRequestBody(updateConfigSchema),
  ],
  updateConfig,
);

export default router;
