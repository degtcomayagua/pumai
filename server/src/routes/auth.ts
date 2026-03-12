import express from "express";

// Controllers
import accountsRegister from "../controllers/auth/register";
import accountsDelete from "../controllers/auth/delete";
import accountsFetch from "../controllers/auth/fetch";
import accountsLogin from "../controllers/auth/login";
import accountsLogout from "../controllers/auth/logout";
import enableTFAHandler from "../controllers/auth/enable-tfa";
import disableTFAHandler from "../controllers/auth/disable-tfa";
import updatePreferencesHandler from "../controllers/auth/update-preferences";
import updateProfileHandler from "../controllers/auth/update-profile";
import changeEmailHandler from "../controllers/auth/change-email";
import requestEmailVerificationHandler from "../controllers/auth/request-email-verification";
import verifyEmailHandler from "../controllers/auth/verify-email";
import changePasswordHandler from "../controllers/auth/change-password";
import resetPasswordHandler from "../controllers/auth/reset-password";
import forgotPasswordHandler from "../controllers/auth/forgot-password";
import generateTFaSecret from "../controllers/auth/utils/generate-tfa-secret";

// Middlewares
import { validateRequestBody } from "../middleware/validationMiddleware";
import {
  ensureAuthenticated,
  ensurePermissions,
} from "../middleware/authMiddleware";

// Schemas
import {
  registerSchema,
  deleteAccountSchema,
  loginAccountSchema,
  changeEmailSchema,
  verifyEmailSchema,
  changePasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  enableTfaSchema,
  disableTfaSchema,
} from "../../../shared/schemas/auth";

const router = express.Router();

// Account creation and deletion
router.post(
  "/register",
  [validateRequestBody(registerSchema)],
  accountsRegister,
);

router.post(
  "/delete",
  [ensureAuthenticated, validateRequestBody(deleteAccountSchema)],
  accountsDelete,
);

// Account access
router.post("/login", [validateRequestBody(loginAccountSchema)], accountsLogin);
router.post("/logout", [ensureAuthenticated], accountsLogout);
router.get("/fetch", [ensureAuthenticated], accountsFetch);

// Account email
router.post(
  "/change-email",
  [ensureAuthenticated, validateRequestBody(changeEmailSchema)],
  changeEmailHandler,
);
router.post(
  "/verify-email",
  [validateRequestBody(verifyEmailSchema)],
  verifyEmailHandler,
);
router.post("/request-email-verification", [], requestEmailVerificationHandler);

// Account password
router.post(
  "/change-password",
  [
    ensureAuthenticated,
    ensurePermissions(["profile:update"]),
    validateRequestBody(changePasswordSchema),
  ],
  changePasswordHandler,
);

router.post(
  "/reset-password",
  ensurePermissions(["profile:update"]),
  [validateRequestBody(resetPasswordSchema)],
  resetPasswordHandler,
);
router.post(
  "/forgot-password",
  ensurePermissions(["profile:update"]),
  [validateRequestBody(forgotPasswordSchema)],
  forgotPasswordHandler,
);

// Profile update
router.post(
  "/update-preferences",
  ensurePermissions(["profile:update"]),
  [ensureAuthenticated, validateRequestBody(updatePreferencesSchema)],
  updatePreferencesHandler,
);
router.post(
  "/update-profile",
  ensurePermissions(["profile:update"]),
  [ensureAuthenticated, validateRequestBody(updateProfileSchema)],
  updateProfileHandler,
);

// TFA
router.post(
  "/enable-tfa",
  [
    ensureAuthenticated,
    ensurePermissions(["profile:update"]),
    validateRequestBody(enableTfaSchema),
  ],
  enableTFAHandler,
);

router.post(
  "/disable-tfa",
  [
    ensureAuthenticated,
    ensurePermissions(["profile:update"]),
    validateRequestBody(disableTfaSchema),
  ],
  disableTFAHandler,
);

router.post("/generate-tfa-secret", [ensureAuthenticated], generateTFaSecret);

export default router;
