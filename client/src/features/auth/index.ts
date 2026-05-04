// Slice
import slice, { login, logout, fetch } from "./slice";

// API
import * as AuthAPITypes from "../../../../shared/api/auth";
import * as schemas from "../../../../shared/schemas/auth";
import authApi from "./api";

export type { AuthAPITypes };
export default {
  slice,
  authApi,
  actions: {
    login,
    logout,
    fetch,
  },
  schemas,
};
