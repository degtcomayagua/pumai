import { z } from "zod";
import { metadataFields, metadataPopulateFields } from "./index.js";

// Shared
const workflowFields = z.enum(
  [
    "_id",
    "name",
    "description",
    "url",
    "protocol",
    "type",
    "isRestricted",
    "allowedRoles",
    "isActive",
    "auth",
    "tags",
    "iconUrl",
    ...metadataFields,
  ],
  { message: "invalid-field" },
);

const workflowPopulate = z.literal([...metadataPopulateFields], {
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

  url: z.url("invalid-url").trim(),

  protocol: z.enum(["webhook", "websocket"], {
    message: "invalid-protocol",
  }),

  type: z.enum(["n8n", "custom"], {
    message: "invalid-type",
  }),

  isRestricted: z.boolean().default(false),

  allowedRoles: z.array(z.cuid("invalid-role-id")).default([]),

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
});

// Update
const updateSchema = z
  .object({ workflowId: z.cuid("invalid-workflow-id") })
  .merge(createSchema.partial());

// Delete
const deleteSchema = z.object({
  workflowId: z.cuid("invalid-workflow-id"),
});

// Restore
const restoreSchema = z.object({
  workflowId: z.cuid("invalid-workflow-id"),
});

// Get
const getSchema = z.object({
  workflowIds: z.array(z.cuid("invalid-workflow-id")),
  fields: z.array(workflowFields).optional(),
  populate: z.array(workflowPopulate).optional(),
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
        .min(1, "searchIn-too-short")
    })
    .optional(),
  filters: z.object({
    protocol: z
      .enum(["webhook", "websocket"], {
        message: "invalid-protocol",
      })
      .optional(),
    type: z
      .enum(["n8n", "custom"], {
        message: "invalid-type",
      })
      .optional(),
    isRestricted: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).optional(),
  fields: z.array(workflowFields).optional(),
  populate: z.array(workflowPopulate).optional(),
});

export {
  workflowFields,
  workflowPopulate,
  createSchema,
  updateSchema,
  deleteSchema,
  getSchema,
  restoreSchema,
  listSchema,
};
