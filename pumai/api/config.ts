import { IConfig } from "../models/config";

import { z } from "zod";
import { updateConfigSchema } from "../schemas/config";

export interface GetConfigResponseData {
  status: "success" | "internal-error";
  config?: IConfig;
}

export type UpdateConfigRequestBody = z.infer<typeof updateConfigSchema>;
export type UpdateResponseData =
  | { status: "success"; config: IConfig }
  | { status: "not-found" }
  | { status: "internal-error" };
