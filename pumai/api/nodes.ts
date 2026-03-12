import { z } from "zod";
import { listSchema, registerSchema } from "../schemas/nodes";

import { ResponseStatus } from ".";
import { INode } from "../models/node";

export type RegisterRequestBody = z.infer<typeof registerSchema>;
export type RegisterResponseData = {
  status: ResponseStatus;
  node?: INode;
};

export type ListRequestBody = z.infer<typeof listSchema>;
export type ListResponseData = {
  status: ResponseStatus;
  nodes?: INode[];
  totalNodes?: number;
};

export type TestConnectionResponseData = {
  status: ResponseStatus;
  message?:
    | "micaja-available"
    | "micaja-too-many-nodes"
    | "micaja-maintenance-mode";
};
