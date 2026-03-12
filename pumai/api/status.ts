import { ResponseStatus } from "../../models";

export type PingRequestBody = {};

// Response types
export interface PingResponseData {
  status: ResponseStatus;
}
