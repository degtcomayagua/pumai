import { ResponseStatus } from ".";

import { z } from "zod";
import {
  changeEmailSchema,
  registerSchema,
  deleteAccountSchema,
  loginAccountSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  enableTfaSchema,
  disableTfaSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas/auth";

// #region Account creation and deletion
export type RegisterRequestBody = z.infer<typeof registerSchema>;
export type DeleteRequestBody = z.infer<typeof deleteAccountSchema>;

export interface RegisterResponseData {
  status: "email-in-use" | "no-roles-defined" | ResponseStatus;
  account?: any;
}

export interface DeleteResponseData {
  status:
    | ResponseStatus
    | "invalid-credentials"
    | "invalid-tfa-code"
    | "missing-tfa-code";
}
// #endregion

// #region Account access
export type LoginRequestBody = z.infer<typeof loginAccountSchema>;

export interface LoginResponseData {
  status:
    | ResponseStatus
    | "invalid-credentials"
    | "requires-tfa"
    | "invalid-tfa-code";
  account?: any;
}

export interface FetchResponseData {
  status: ResponseStatus;
  account?: any;
}

export interface LogoutResponseData {
  status: ResponseStatus;
}
// #endregion

// #region Account update
export type UpdateProfileRequestBody = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesRequestBody = z.infer<
  typeof updatePreferencesSchema
>;
// #endregion

// #region Account TFA
export interface GenerateTFASecretResponseData {
  status: ResponseStatus;
  secret?: string;
  otpauth?: string;
}

export type EnableTFARequestBody = z.infer<typeof enableTfaSchema>;
export type DisableTFARequestBody = z.infer<typeof disableTfaSchema>;

export interface EnableTFAResponseData {
  status:
    | ResponseStatus
    | "success"
    | "invalid-credentials"
    | "tfa-already-enabled"
    | "invalid-tfa-code";
}

export interface DisableTFAResponseData {
  status:
    | ResponseStatus
    | "invalid-credentials"
    | "invalid-tfa-code"
    | "tfa-not-enabled";
}
// #endregion

// #region Account password
export type ChangePasswordRequestBody = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordRequestBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequestBody = z.infer<typeof resetPasswordSchema>;

export interface ChangePasswordResponseData {
  status: ResponseStatus | "success" | "invalid-credentials" | "internal-error";
}

export interface ForgotPasswordResponseData {
  status:
    | ResponseStatus
    | "success"
    | "invalid-parameters"
    | "account-not-found"
    | "internal-error";
}

export interface ResetPasswordResponseData {
  status: ResponseStatus | "invalid-token";
}
// #endregion

// #region Account email
export interface RequestAccountEmailVerificationResponseData {
  status: ResponseStatus | "account-not-found" | "email-already-verified";
}

export type VerifyAccountEmailRequestBody = z.infer<typeof verifyEmailSchema>;
export type ChangeEmailRequestBody = z.infer<typeof changeEmailSchema>;

export interface VerifyAccountEmailResponseData {
  status: ResponseStatus | "invalid-token";
}

export interface ChangeEmailResponseData {
  status: ResponseStatus | "email-in-use" | "invalid-credentials";
}
// #endregion

export interface UpdateProfileResponseData {
  status: ResponseStatus;
  account?: any;
}

export interface UpdatePreferencesResponseData {
  status: ResponseStatus;
  account?: any;
}
