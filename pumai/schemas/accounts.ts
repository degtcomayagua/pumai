import { z } from "zod";
import { zObjectId, zObjectIdWithMessage, turnIntoUndefinedIfEmpty } from ".";

const createSchema = z.object({
  email: z.email("invalid-email"),
  name: z.string().min(1, "name-too-short").max(100, "name-too-long"),
  password: z
    .string()
    .min(8, "password-too-short")
    .max(256, "password-too-long"),
  roleId: zObjectIdWithMessage("role-required"),
  notify: z.boolean().optional(),
  locale: z.enum(["en", "de", "fr", "es"], "invalid-locale").optional(),
});

const deleteSchema = z.object({
  accountId: zObjectId,
});

const updateSchema = z.object({
  accountId: zObjectId,
  name: z
    .string()
    .min(2, "name-too-short")
    .max(100, "name-too-long")
    .optional(),
  email: z.email("invalid-email").optional(),
  password: turnIntoUndefinedIfEmpty(
    z.union(
      [
        z.string().min(8, "password-too-short").max(100, "password-too-long"),
        z.undefined("password-optional"),
      ],
      { message: "password-optional" },
    ),
  ),
  roleId: zObjectId.optional(),
  notify: z.boolean().optional(),
  disableTwoFactor: z.boolean().optional(),
});

const getSchema = z.object({
  accountIds: z.array(zObjectId),
  fields: z
    .array(
      z.enum(
        ["_id", "data", "email", "profile", "preferences", "metadata"],
        "invalid-field",
      ),
    )
    .optional(),
});

const listSchema = z.object({
  count: z.number().min(0, "count-too-low"),
  page: z.number().nonnegative("page-too-low"),
  filters: z
    .object({
      role: zObjectId.optional(),
    })
    .optional(),
  search: z
    .object({
      query: z.string().max(100, "query-too-long"),
      searchIn: z.array(
        z.enum(["profile.name", "email.value"], "invalid-search-field"),
      ),
    })
    .optional(),
  includeDeleted: z.boolean().optional(),
  fields: z
    .array(
      z.enum(
        ["_id", "data", "email", "profile", "preferences", "metadata"],
        "invalid-field",
      ),
    )
    .optional(),
  populate: z.array(z.literal("data.role"), "invalid-populate-path").optional(),
});

export { createSchema, deleteSchema, getSchema, updateSchema, listSchema };
