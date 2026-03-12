import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1, "prompt-too-short").max(5000, "prompt-too-long"),
  chat: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z
        .string()
        .min(1, "message-content-too-short")
        .max(10000, "message-content-too-long"),
    }),
  ),

  // New
  campuses: z
    .array(
      z.enum([
        "COMAYAGUA",
        "TEGUCIGALPA",
        "SANPEDRO",
        "CHOLUTECA",
        "LA CEIBA",
        "DANLI",
        "SANTA ROSA",
        "GLOBAL",
      ]),
    )
    .min(1, "at-least-one-campus-required"),

  deliveryModes: z
    .array(z.enum(["onsite", "online", "hybrid"], {}))
    .min(1, "at-least-one-delivery-mode-required"),

  category: z
    .enum([
      "regulation",
      "administrative",
      "campus_service",
      "student_life",
      "support",
    ])
    .optional(),
});
export { generateSchema };
