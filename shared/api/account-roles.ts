import { AccountRole, Prisma } from "@prisma/client";
import { ResponseStatus } from "./index.js";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  restoreSchema,
} from "../schemas/account-roles.js";

// Inferred request body types
export type GetRequestBody = z.infer<typeof getSchema>;
export type CreateRequestBody = z.infer<typeof createSchema>;
export type DeleteRequestBody = z.infer<typeof deleteSchema>;
export type RestoreRequestBody = z.infer<typeof restoreSchema>;
export type UpdateRequestBody = z.infer<typeof updateSchema>;
export type ListRequestBody = z.infer<typeof listSchema>;

// Response types
export interface GetResponseData {
  status: ResponseStatus;
  accountRoles?: Prisma.AccountRoleGetPayload<{
    include: {
      metadata: true;
    };
  }>[];
}

export interface ListResponseData {
  status: ResponseStatus;
  accountRoles?: Prisma.AccountRoleGetPayload<{
    include: {
      metadata: true;
    };
  }>[];
  totalAccountRoles?: number;
}

export interface DeleteResponseData {
  status: ResponseStatus | "role-not-found";
  accountRole?: AccountRole;
}

export interface RestoreResponseData {
  status: ResponseStatus | "role-not-found";
  accountRole?: AccountRole;
}

export interface CreateResponseData {
  status: ResponseStatus | "level-in-use" | "level-too-high";
  accountRole?: AccountRole;
}

export interface UpdateResponseData {
  status: ResponseStatus | "level-in-use" | "level-too-high" | "role-not-found";
  accountRole?: AccountRole;
}
