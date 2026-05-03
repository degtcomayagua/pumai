import express from "express";

// import getHandler from "../controllers/logs/get.js";
// import listHandler from "../controllers/logs/list.js";

import { validateRequestBody } from "../middleware/validationMiddleware.js";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware.js";
import { getSchema, listSchema } from "@shared/schemas/logs.js"

const router = express.Router();

router.use(ensureAuthenticated);

// router.post(
//   "/list",
//   ensurePermissions(["logs:read"]),
//   validateRequestBody(listSchema),
//   listHandler,
// );

// router.post(
//   "/get",
//   ensurePermissions(["logs:read"]),
//   validateRequestBody(getSchema),
//   getHandler,
// );

export default router;
