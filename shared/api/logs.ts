import { Log } from "../../generated/prisma/client.js";
import { ResponseStatus } from "./index.js";

import { z } from "zod";
import {
  getSchema,
  listSchema,
} from "../schemas/logs.js";

export type GetRequestBody = z.infer<typeof getSchema>;
export interface GetResponseData {
  status: ResponseStatus;
  logs?: Log[];
}

export type ListRequestBody = z.infer<typeof listSchema>;
export interface ListResponseData {
  status: ResponseStatus;
  logs?: Log[];
  totalLogs?: number;
}


