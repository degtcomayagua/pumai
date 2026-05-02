import { Config } from "../../generated/prisma/client";

import { z } from "zod";
import { updateConfigSchema } from "../schemas/config";

export interface GetConfigResponseData {
  status: "success" | "internal-error";
  config?: Config;
}

export type UpdateConfigRequestBody = z.infer<typeof updateConfigSchema>;
export type UpdateResponseData =
  | { status: "success"; config: Config }
  | { status: "not-found" }
  | { status: "internal-error" };
