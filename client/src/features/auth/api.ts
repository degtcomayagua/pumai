import axios from "axios";

import type { AuthAPITypes } from ".";

import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/auth"
    : "/api/auth";

const axiosClient = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const authApi = {
  async login(
    data: AuthAPITypes.LoginRequestBody,
  ): Promise<AuthAPITypes.LoginResponseData> {
    try {
      const response = await axiosClient.post<AuthAPITypes.LoginResponseData>(
        "/login",
        data,
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async fetch(): Promise<AuthAPITypes.FetchResponseData> {
    try {
      const response =
        await axiosClient.get<AuthAPITypes.FetchResponseData>("/fetch");

      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async logout(): Promise<AuthAPITypes.LogoutResponseData> {
    try {
      const response = await axiosClient.post<AuthAPITypes.LogoutResponseData>(
        "/logout",
        {},
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default authApi;
