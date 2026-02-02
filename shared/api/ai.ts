import { z } from "zod";

import { ResponseStatus } from "../models";
import { generateSchema } from "../schemas/ai";

export type GenerateRequestBody = z.infer<typeof generateSchema>;

// Response types
export interface GenerateResponseData {
  status: ResponseStatus;
  result: string;
}
