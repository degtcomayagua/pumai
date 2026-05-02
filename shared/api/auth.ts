import { ResponseStatus } from ".";

import { z } from "zod";
import {
  loginAccountSchema,
} from "../schemas/auth";
import { ISessionAccount } from "../types/sessions";

export interface RegisterResponseData {
  status: "email-in-use" | "no-roles-defined" | ResponseStatus;
  account?: any;
}

export interface DeleteResponseData {
  status:
  | ResponseStatus
  | "invalid-credentials"
  | "invalid-tfa-code"
  | "missing-tfa-code";
}
// #endregion

// #region Account access
export type LoginRequestBody = z.infer<typeof loginAccountSchema>;

export interface LoginResponseData {
  status:
  | ResponseStatus
  | "invalid-credentials"
  | "requires-tfa"
  | "invalid-tfa-code";
  account?: ISessionAccount;
}

export interface FetchResponseData {
  status: ResponseStatus;
  account?: ISessionAccount;
}

export interface LogoutResponseData {
  status: ResponseStatus;
}
// #endregion
