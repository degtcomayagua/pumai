import "express";
import express from "express";
import { Account, AccountRole } from "@prisma/client";

export type AccountWithRole = Account & {
  role: AccountRole
};

// Optional utility type to infer types from Zod schemas
export type TypedRequest<T> = Omit<express.Request, "body" | "parsedBody"> & {
  parsedBody: T;
  traceId: string;
};

// Global patch for Express to support traceId, terminalId, and parsedBody (as `any`)
declare module "express-serve-static-core" {
  interface Request {
    traceId: string;
    parsedBody?: unknown; // We override this using `TypedRequest<T>` where needed
  }
}

// Add AccountWithRole to the req.user type
declare global {
  namespace Express {
    interface User extends AccountWithRole { }
  }
}