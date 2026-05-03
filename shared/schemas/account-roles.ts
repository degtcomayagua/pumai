import { z } from "zod";
import { metadataFields, metadataPopulateFields } from "./index.js"

// Shared fields
const nameSchema = z
  .string()
  .min(1, "name-too-short")
  .max(100, "name-too-long");
const descSchema = z.string().max(500, "description-too-long").optional();
const levelSchema = z
  .number("invalid-level")
  .min(0, "invalid-level")
  .max(1000, "invalid-level"); // Arbitrary upper bound for sanity
const permissionsSchema = z.array(z.string().min(1).max(100));
const requiresTwoFactorSchema = z.boolean();

// Create
const createSchema = z.object({
  name: nameSchema,
  description: descSchema,
  level: levelSchema,
});

// Update (cannot update `isSystemRole`)
const updateSchema = z.object({
  roleId: z.cuid("invalid-role-id"),
  name: nameSchema.optional(),
  description: descSchema,
  level: levelSchema.optional(),
  permissions: permissionsSchema.optional(),
  requiresTwoFactor: requiresTwoFactorSchema.optional(),
});

// Delete
const deleteSchema = z.object({
  roleId: z.cuid("invalid-role-id"),
});

// Restore
const restoreSchema = z.object({
  roleId: z.cuid("invalid-role-id"),
});

// Get
const getSchema = z.object({
  roleIds: z.array(z.cuid()),
  fields: z
    .array(
      z.enum(
        [
          ...metadataFields,
          "id",
          "name",
          "description",
          "isSystemRole",
          "level",
          "permissions",
          "requiresTwoFactor",
        ],
        "invalid-field",
      ),
    )
    .optional(),
  populate: z.array(z.enum(metadataPopulateFields, "invalid-populate-path")).optional(),
});

// List
const listSchema = z.object({
  count: z.number().min(1, "count-too-low"),
  page: z.number().min(0, "page-too-low"),
  includeDeleted: z.boolean().optional(),
  search: z
    .object({
      query: z.string().min(1, "query-too-short"),
      searchIn: z.array(z.enum(["name", "description"], "invalid-search-field")),
    })
    .optional(),
  fields: z
    .array(
      z.enum(
        [
          ...metadataFields,
          "id",
          "name",
          "description",
          "isSystemRole",
          "level",
          "permissions",
          "requiresTwoFactor",
        ],
        "invalid-field",
      ),
    )
    .optional(),
  populate: z.array(z.enum(metadataPopulateFields, "invalid-populate-path")).optional(),
});

export {
  createSchema,
  updateSchema,
  deleteSchema,
  getSchema,
  restoreSchema,
  listSchema,
};
