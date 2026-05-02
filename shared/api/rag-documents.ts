import { RAGDocument } from "../../generated/prisma/client";
import { ResponseStatus } from ".";
import { z } from "zod";

import {
  createSchema,
  deleteSchema,
  getSchema,
  updateSchema,
  listSchema,
  restoreSchema,
} from "../schemas/rag-documents";

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
  ragDocuments?: RAGDocument[];
}

export interface ListResponseData {
  status: ResponseStatus;
  ragDocuments?: RAGDocument[];
  totalRagDocuments?: number;
}

export interface DeleteResponseData {
  status: ResponseStatus | "rag-document-not-found";
  ragDocument?: RAGDocument;
}

export interface RestoreResponseData {
  status: ResponseStatus | "rag-document-not-found";
  ragDocument?: RAGDocument;
}

export interface CreateResponseData {
  status: ResponseStatus;
  ragDocument?: RAGDocument;
}

export interface UpdateResponseData {
  status: ResponseStatus | "rag-document-not-found";
  ragDocument?: RAGDocument;
}
