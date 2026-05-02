import { Workflow } from "../../generated/prisma/client";
import { ResponseStatus } from ".";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  restoreSchema,
} from "../schemas/workflows";

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
  workflows?: Workflow[];
}

export interface ListResponseData {
  status: ResponseStatus;
  workflows?: Workflow[];
  totalWorkflows?: number;
}

export interface CreateResponseData {
  status: ResponseStatus;
  workflow?: Workflow;
}

export interface UpdateResponseData {
  status: ResponseStatus | "workflow-not-found";
  workflow?: Workflow;
}

export interface DeleteResponseData {
  status: ResponseStatus | "workflow-not-found";
  workflow?: Workflow;
}

export interface RestoreResponseData {
  status: ResponseStatus | "workflow-not-found";
  workflow?: Workflow;
}