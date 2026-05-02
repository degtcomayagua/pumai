import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "password-too-short")
  .max(256, "password-too-long");

const tfaCodeSchema = z.string().regex(/^\d{6,8}$/, "invalid-tfa-code");

// Account access
export const loginAccountSchema = z.object({
  email: z.email("invalid-email"),
  password: passwordSchema,
  tfaCode: tfaCodeSchema.optional(),
});
