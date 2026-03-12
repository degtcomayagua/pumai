import { z } from "zod";

const taxSchema = z.object({
  name: z.string().min(1, "tax-name-too-short"),
  rate: z.number().nonnegative("tax-rate-negative"),
  type: z.enum(["ISV", "custom"]),
});

const paymentMethodSchema = z.object({
  name: z.string().min(1, "payment-method-name-too-short"),
  type: z.enum(["cash", "card", "credit", "bank-transfer", "other"]),
  enabled: z.boolean(),
});

const businessInfoSchema = z.object({
  name: z
    .string()
    .min(3, "business-name-too-short")
    .max(300, "business-name-too-long"),
  address: z
    .string()
    .min(1, "business-address-too-short")
    .max(500, "business-address-too-long"),
  phone: z
    .string()
    .min(1, "business-phone-too-short")
    .max(20, "business-phone-too-long"),
  email: z.string().email("invalid-business-email"),
  rtn: z.string().length(14, "business-rtn-invalid"),
});

const notificationsSchema = z.object({
  telegram: z.object({
    enabled: z.boolean(),
    botToken: z.string(),
    chatId: z.string(),
  }),
  email: z.object({
    enabled: z.boolean(),
    fromAddress: z.string(),
    smtpHost: z.string(),
    smtpPort: z.number(),
    smtpUser: z.string(),
    smtpPassword: z.string(),
  }),
  sms: z.object({
    enabled: z.boolean(),
    provider: z.string(),
    apiKey: z.string(),
    apiSecret: z.string(),
  }),
});

const createConfigSchema = z.object({
  currency: z.string().min(1, "currency-too-short"),
  businessInfo: businessInfoSchema,
  taxes: z.array(taxSchema),
  paymentMethods: z.array(paymentMethodSchema),
  timezone: z.string().min(1, "timezone-too-short"),
  notifications: notificationsSchema,
  metadata: z.any().optional(), // metadata handled server side, keep optional or omit
});

const updateConfigSchema = createConfigSchema.partial();

export { createConfigSchema, updateConfigSchema };
