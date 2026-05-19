import { Config } from "@prisma/client";

import { z } from "zod";
import { updateConfigSchema } from "../schemas/config.js";

export interface GetConfigResponseData {
  status: "success" | "internal-error";
  config?: Config;
}

export type UpdateConfigRequestBody = z.infer<typeof updateConfigSchema>;
export type UpdateResponseData =
  | { status: "success"; config: Config }
  | { status: "not-found" }
  | { status: "internal-error" };
