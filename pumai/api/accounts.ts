import type { IAccount } from "../models/account";
import { ResponseStatus } from ".";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
} from "../schemas/accounts";

// Inferred types from Zod schemas
export type GetRequestBody = z.infer<typeof getSchema>;
export type CreateRequestBody = z.infer<typeof createSchema>;
export type DeleteRequestBody = z.infer<typeof deleteSchema>;
export type UpdateRequestBody = z.infer<typeof updateSchema>;
export type ListRequestBody = z.infer<typeof listSchema>;
export type RestoreRequestBody = z.infer<typeof deleteSchema>;

// Response types

export interface GetResponseData {
  status: ResponseStatus;
  accounts?: IAccount[];
}

export interface ListResponseData {
  status: ResponseStatus;
  accounts?: IAccount[];
  totalAccounts?: number;
}

export interface DeleteResponseData {
  status:
    | ResponseStatus
    | "account-not-found"
    | "cannot-delete-self"
    | "cannot-delete-due-to-role-level";
  account?: IAccount;
}

export interface RestoreResponseData {
  status: ResponseStatus | "account-not-found";
  account?: IAccount;
}

export interface CreateResponseData {
  status:
    | ResponseStatus
    | "role-not-found"
    | "email-in-use"
    | "role-cannot-be-assigned";
  account?: IAccount;
}

export interface UpdateResponseData {
  status:
    | ResponseStatus
    | "account-not-found"
    | "role-not-found"
    | "role-cannot-be-assigned"
    | "email-in-use";
  account?: IAccount;
}
