import { z } from "zod";
import { campuses, isoDateString, metadataFields, metadataPopulateFields } from "./index.js";

const ragDocumentFields = z.enum([
  "_id",
  "title",
  "category",
  "authorityLevel",
  "sourceType",
  "campuses",
  "deliveryModes",
  "effectiveFrom",
  "effectiveUntil",
  "archived",
  "warnings",
  "summary",
  "tags",
  ...metadataFields,
])

const ragDocumentPopulateFields = z.enum([
  ...metadataPopulateFields,
]);

// Create
const createSchema = z
  .object({
    title: z.string().min(1, "title-too-short").max(200, "title-too-long"),

    category: z.enum([
      "regulation",
      "administrative",
      "campus_service",
      "student_life",
      "support",
    ]),

    content: z.string().min(1, "content-too-short"),
    contentType: z.enum(["file", "text"], "invalid-content-type"),

    authorityLevel: z
      .number()
      .int("authorityLevel-must-be-integer")
      .min(0, "authorityLevel-too-low")
      .max(1000, "authorityLevel-too-high"),

    sourceType: z.enum(["official", "approved_student"], {}),

    campuses: z
      .array(
        z.enum(campuses)
      )
      .min(1, "at-least-one-campus-required"),

    deliveryModes: z
      .array(z.enum(["onsite", "online", "hybrid"], {}))
      .min(1, "at-least-one-delivery-mode-required"),

    effectiveFrom: isoDateString,
    effectiveUntil: isoDateString.optional().nullable(),

    warnings: z
      .object({
        legal: z.string().max(500).optional(),
        timeSensitive: z.string().max(500).optional(),
        campusSpecific: z.string().max(500).optional(),
      })
      .optional(),

    summary: z
      .string()
      .min(1, "summary-too-short")
      .max(5000, "summary-too-long"),

    tags: z
      .array(z.string().min(1, "tag-too-short").max(50, "tag-too-long"))
      .max(20, "too-many-tags")
      .optional(),
  })
  .refine(
    (data) =>
      !data.effectiveUntil ||
      new Date(data.effectiveUntil) >= new Date(data.effectiveFrom),
    {
      message: "effectiveUntil-cannot-be-before-effectiveFrom",
      path: ["effectiveUntil"],
    },
  )
  .refine(
    (data) =>
      data.contentType === "file" ||
      (data.contentType === "text" && data.content),
    {
      message: "content-required-for-text-contentType",
    },
  );

// Update
const updateSchema = z.object({
  ragDocumentId: z.cuid("invalid-rag-document-id"),
});

// Delete
const deleteSchema = z.object({
  ragDocumentId: z.cuid("invalid-rag-document-id"),
});

// Restore
const restoreSchema = z.object({
  ragDocumentId: z.cuid("invalid-rag-document-id"),
});

// Get
const getSchema = z.object({
  ragDocumentIds: z.array(z.cuid("invalid-rag-document-id")),
  fields: z.array(ragDocumentFields, "invalid-field").optional(),
  populate: z.array(ragDocumentPopulateFields, "invalid-populate-path").optional(),
});

// List
const listSchema = z.object({
  count: z.number().min(1, "count-too-low"),
  page: z.number().min(0, "page-too-low"),
  includeDeleted: z.boolean().optional(),
  search: z
    .object({
      query: z.string().min(1, "query-too-short"),
      searchIn: z.array(z.enum(["name"], "invalid-search-field")),
    })
    .optional(),
  fields: z.array(ragDocumentFields, "invalid-field").optional(),
  populate: z.array(ragDocumentPopulateFields, "invalid-populate-path").optional(),
});

export {
  createSchema,
  updateSchema,
  deleteSchema,
  getSchema,
  restoreSchema,
  listSchema,
};
