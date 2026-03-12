import { z } from "zod";
import { zObjectId } from ".";

const passwordSchema = z
  .string()
  .min(8, "password-too-short")
  .max(256, "password-too-long");

const tfaCodeSchema = z.string().regex(/^\d{6,8}$/, "invalid-tfa-code");

const tfaSecretSchema = z
  .string()
  .regex(/^[A-Z2-7]+=*$/i, "invalid-tfa-secret");

// Account creation/deletion
export const registerSchema = z.object({
  email: z.email("invalid-email"),
  name: z.string().min(2, "name-too-short").max(100, "name-too-long"),
  password: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: passwordSchema,
  tfaCode: tfaCodeSchema.optional(),
});

// Account access
export const loginAccountSchema = z.object({
  email: z.email("invalid-email"),
  password: passwordSchema,
  tfaCode: tfaCodeSchema.optional(),
});

// Account email
export const changeEmailSchema = z.object({
  password: passwordSchema,
  newEmail: z.email("invalid-email"),
});

export const verifyEmailSchema = z.object({
  token: z.uuid({ version: "v4", message: "invalid-token" }),
});

// Account password
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  token: z.uuid({ version: "v4", message: "invalid-token" }),
  newPassword: z.string().min(8).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.email("invalid-email"),
});

// Profile update routes
export const updatePreferencesSchema = z.object({});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "name-too-short")
    .max(100, "name-too-long")
    .optional(),
});

// TFA routes
export const enableTfaSchema = z.object({
  password: passwordSchema,
  tfaCode: tfaCodeSchema,
  secret: tfaSecretSchema,
});

export const disableTfaSchema = z.object({
  password: passwordSchema,
  tfaCode: tfaCodeSchema,
});
