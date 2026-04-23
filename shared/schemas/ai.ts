import { z } from "zod";

export const generateSchema = z.object({
  prompt: z.string().min(1, "prompt-too-short").max(5000, "prompt-too-long"),
  workflowSessionId: z
    .string()
    .min(1, "workflow-session-id-too-short")
    .max(128, "workflow-session-id-too-long")
    .optional(),
  chat: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z
        .string()
        .min(1, "message-content-too-short")
        .max(10000, "message-content-too-long"),
    }),
  ),
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
    .array(z.enum(["onsite", "online", "hybrid"]))
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
  tools: z
    .array(
      z.object({
        type: z.string().default("function"),
        function: z.object({
          name: z.string().min(1, "tool-name-required"),
          description: z.string().optional(),
          type: z.string().optional(),
          parameters: z.record(z.any(), z.any()).optional(),
        }),
      }),
    )
    .optional(),
  mcpServers: z
    .array(
      z.object({
        name: z.string().min(1, "mcp-server-name-required"),
        description: z.string().optional(),
        url: z.url("invalid-mcp-server-url"),
        protocol: z.enum(["streamable-http", "sse"]).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const streamSchema = generateSchema;

export type GenerateRequestBody = z.infer<typeof generateSchema>;
export type StreamRequestBody = GenerateRequestBody;
