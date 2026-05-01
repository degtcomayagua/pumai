import { z } from "zod";
import { metadataFields, metadataPopulateFields, zObjectId } from ".";

// Shared
const mcpServerFields = z.enum(
  [
    "_id",
    "name",
    "description",
    "url",
    "protocol",
    "isRestricted",
    "allowedRoles",
    "isActive",
    "auth",
    "tags",
    "iconUrl",
    "_references",
    ...metadataFields,
  ],
  { message: "invalid-field" },
);

const mcpServerPopulate = z.literal([...metadataPopulateFields], {
  message: "invalid-populate-path",
});

// Create
const createSchema = z.object({
  name: z.string().min(1, "name-too-short").max(200, "name-too-long").trim(),

  description: z
    .string()
    .min(1, "description-too-short")
    .max(1000, "description-too-long")
    .trim(),

  url: z.string().url("invalid-url").trim(),

  protocol: z.enum(["streamable-http", "sse"], {
    message: "invalid-protocol",
  }),

  isRestricted: z.boolean().default(false),

  allowedRoles: z.array(zObjectId).default([]),

  isActive: z.boolean().default(true),

  auth: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("none") }),
      z.object({
        type: z.literal("bearer"),
        token: z.string().min(1, "token-too-short"),
      }),
      z.object({
        type: z.literal("api-key"),
        headerName: z.string().min(1, "headerName-too-short"),
        key: z.string().min(1, "key-too-short"),
      }),
      z.object({
        type: z.literal("basic"),
        username: z.string().min(1, "username-too-short"),
        password: z.string().min(1, "password-too-short"),
      }),
    ])
    .default({ type: "none" }),

  tags: z
    .array(z.string().min(1, "tag-too-short").max(50, "tag-too-long"))
    .max(20, "too-many-tags")
    .optional(),

  iconUrl: z.string().url("invalid-icon-url").optional(),

  _references: z.record(z.string(), z.string()).optional(),
});

// Update
const updateSchema = z
  .object({ mcpServerId: zObjectId })
  .merge(createSchema.partial());

// Delete
const deleteSchema = z.object({
  mcpServerId: zObjectId,
});

// Restore
const restoreSchema = z.object({
  mcpServerId: zObjectId,
});

// Get
const getSchema = z.object({
  mcpServerIds: z.array(zObjectId),
  fields: z.array(mcpServerFields).optional(),
  populate: z.array(mcpServerPopulate).optional(),
});

// List
const listSchema = z.object({
  count: z.number().min(1, "count-too-low"),
  page: z.number().min(0, "page-too-low"),
  includeDeleted: z.boolean().optional(),
  search: z
    .object({
      query: z.string().min(1, "query-too-short"),
      searchIn: z
        .array(
          z.enum(["name", "description"], { message: "invalid-search-field" }),
        )
        .min(1, "searchIn-too-short"),
    })
    .optional(),
  filters: z
    .object({
      protocol: z
        .enum(["streamable-http", "sse"], { message: "invalid-protocol" })
        .optional(),
      isRestricted: z.boolean().optional(),
      isActive: z.boolean().optional(),
    })
    .optional(),
  fields: z.array(mcpServerFields).optional(),
  populate: z.array(mcpServerPopulate).optional(),
});

export {
  mcpServerFields,
  mcpServerPopulate,
  createSchema,
  updateSchema,
  deleteSchema,
  getSchema,
  restoreSchema,
  listSchema,
};