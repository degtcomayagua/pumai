import { Account, Prisma } from "@prisma/client";
import { ResponseStatus } from "./index.js";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  updatePasswordSchema,
  updateStatusSchema,
} from "../schemas/accounts.js";

// Inferred types from Zod schemas
export type GetRequestBody = z.infer<typeof getSchema>;
export type CreateRequestBody = z.infer<typeof createSchema>;
export type DeleteRequestBody = z.infer<typeof deleteSchema>;
export type UpdateRequestBody = z.infer<typeof updateSchema>;
export type ListRequestBody = z.infer<typeof listSchema>;
export type RestoreRequestBody = z.infer<typeof deleteSchema>;
export type UpdatePasswordRequestBody = z.infer<typeof updatePasswordSchema>;
export type UpdateStatusRequestBody = z.infer<typeof updateStatusSchema>;

// Response types

export interface GetResponseData {
  status: ResponseStatus;
  accounts?: Prisma.AccountGetPayload<{
    include: {
      metadata: true;
      role: true;
    };
  }>[];
}

export interface ListResponseData {
  status: ResponseStatus;
  accounts?: Prisma.AccountGetPayload<{
    include: {
      metadata: true;
      role: true;
    };
  }>[];
  totalAccounts?: number;
}

export interface DeleteResponseData {
  status:
  | ResponseStatus
  | "account-not-found"
  | "cannot-delete-self"
  | "cannot-delete-due-to-role-level";
  account?: Account;
}

export interface RestoreResponseData {
  status: ResponseStatus | "account-not-found";
  account?: Account;
}

export interface CreateResponseData {
  status:
  | ResponseStatus
  | "role-not-found"
  | "email-in-use"
  | "role-cannot-be-assigned";
  account?: Account;
}

export interface UpdateResponseData {
  status:
  | ResponseStatus
  | "account-not-found"
  | "role-not-found"
  | "role-cannot-be-assigned"
  | "email-in-use";
  account?: Account;
}

export interface UpdatePasswordResponseData {
  status:
  | ResponseStatus
  | "account-not-found"
  | "cannot-change-own-password"
  | "cannot-change-password-due-to-role-level";
}

export interface UpdateStatusResponseData {
  status:
  | ResponseStatus
  | "account-not-found"
  | "cannot-update-own-status"
  | "cannot-update-status-due-to-role-level";
}
