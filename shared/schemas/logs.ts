import { z } from "zod";

export const querySchema = z.object({
  level: z
    .enum(["info", "warning", "important", "error", "critical"])
    .optional(),
  source: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  traceId: z.string().max(100).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(200).optional(),
});

export const exportSchema = z.object({
  level: z
    .enum(["info", "warning", "important", "error", "critical"])
    .optional(),
  source: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  traceId: z.string().max(100).optional(),
});
