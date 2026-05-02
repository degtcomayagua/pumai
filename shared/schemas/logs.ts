import { z } from "zod";

const fieldsEnum = z.enum([
  "_id",
  "date",
  "source",
  "level",
  "message",
  "duration",
  "details",
  "traceId",
  "_references",
  "metadata",
]);

export const listSchema = z.object({
  count: z.number().min(1).max(100),
  page: z.number().min(0),
  search: z.object({
    query: z.string().max(100),
    searchIn: z.array(z.enum(["source", "message", "metadata"])),
  }).optional(),
  filters: z.object({
    level: z.enum(["info", "warning", "important", "error", "critical"]).optional(),
    source: z.string().max(200).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    traceId: z.string().max(100).optional(),
  }).optional(),
  includeDeleted: z.boolean().optional(),
  fields: z.array(fieldsEnum).optional(),
  populate: z.array(z.string()).optional(), // Over here we're setting it to any string since our references are dynamic and can change based on the log
})

export const getSchema = z.object({
  logIds: z.array(z.cuid("invalid-log-id")).min(1).max(100),
  fields: z.array(fieldsEnum).optional(),
  populate: z.array(z.string()).optional(),
});