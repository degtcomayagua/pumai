import { z } from "zod";
import {
  metadataFields,
  campuses,
  metadataPopulateFields,
  turnIntoUndefinedIfEmpty,
  campusesEnum,
} from "./index.js";

const populateFields = z.enum([...metadataPopulateFields, "role"]);
const accountFields = z.enum(
  [
    "id",
    "lastLogin",
    "role",
    "status",
    "campus",
    "email",
    "emailVerified",
    "emailLastChanged",
    "name",
    "lastPasswordChange",
    ...metadataFields,
  ],
  "invalid-field",
);

const createSchema = z.object({
  email: z.email("invalid-email"),
  name: z.string().min(1, "name-too-short").max(100, "name-too-long"),
  password: z
    .string()
    .min(8, "password-too-short")
    .max(256, "password-too-long"),
  roleId: z.cuid("invalid-role-id"),
  campus: campusesEnum,
});

const deleteSchema = z.object({
  accountId: z.cuid("invalid-account-id"),
});

const updateSchema = z.object({
  accountId: z.cuid("invalid-account-id"),
  name: z
    .string()
    .min(2, "name-too-short")
    .max(100, "name-too-long")
    .optional(),
  email: z.email("invalid-email").optional(),
  campus: campusesEnum,
  roleId: z.cuid("invalid-role-id").optional(),
  disableTwoFactor: z.boolean().optional(),
});

const getSchema = z.object({
  accountIds: z.array(z.cuid("invalid-account-id")),
  fields: z.array(accountFields, "invalid-field").optional(),
  populate: z.array(populateFields, "invalid-field").optional(),
});

const listSchema = z.object({
  count: z.number().min(0, "count-too-low"),
  page: z.number().nonnegative("page-too-low"),
  filters: z
    .object({
      role: z.cuid("invalid-role-id").optional(),
      campus: z.enum(campuses, "invalid-campus").optional(),
      status: z.enum(["active", "inactive"], "invalid-status").optional(),
    })
    .optional(),
  search: z
    .object({
      query: z.string().max(100, "query-too-long"),
      searchIn: z.array(z.enum(["name", "email"], "invalid-search-field")),
    })
    .optional(),
  includeDeleted: z.boolean().optional(),
  fields: z.array(accountFields, "invalid-field").optional(),
  populate: z.array(populateFields, "invalid-field").optional(),
});

const updatePasswordSchema = z.object({
  accountId: z.cuid("invalid-account-id"),
  newPassword: z
    .string()
    .min(8, "password-too-short")
    .max(256, "password-too-long"),
});

const updateStatusSchema = z.object({
  accountId: z.cuid("invalid-account-id"),
  newStatus: z.enum(["active", "inactive"], "invalid-status"),
});

export {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  updatePasswordSchema,
  updateStatusSchema,
};
