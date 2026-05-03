import express from "express";

// Controllers
import accountsFetch from "../controllers/auth/fetch";
import accountsLogin from "../controllers/auth/login";
import accountsLogout from "../controllers/auth/logout";


// Middlewares
import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
} from "../middleware/authMiddleware";

// Schemas
import {
  loginAccountSchema,
} from "../../../shared/schemas/auth";

const router = express.Router();


// Account access
router.post("/login", [validateRequestBody(loginAccountSchema)], accountsLogin);
router.post("/logout", [ensureAuthenticated], accountsLogout);
router.get("/fetch", [ensureAuthenticated], accountsFetch);

export default router;
