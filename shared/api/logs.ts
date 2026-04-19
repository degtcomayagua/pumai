import { ILog } from "../models/log";
import { ResponseStatus } from ".";

import { z } from "zod";
import {
  getSchema,
  listSchema,
} from "../schemas/logs";

export type GetRequestBody = z.infer<typeof getSchema>;
export interface GetResponseData {
  status: ResponseStatus;
  logs?: ILog[];
}

export type ListRequestBody = z.infer<typeof listSchema>;
export interface ListResponseData {
  status: ResponseStatus;
  logs?: ILog[];
  totalLogs?: number;
}


