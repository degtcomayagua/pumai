// Slice
import slice, { login, logout, register, fetch } from "./slice";

// API
import * as AuthAPITypes from "../../../../shared/types/api/auth";
import * as schemas from "../../../../shared/schemas/auth";
import authApi from "./api";

export type { AuthAPITypes };
export default {
  slice,
  authApi,
  actions: {
    login,
    logout,
    register,
    fetch,
  },
  schemas,
};
