import axios from "axios";
import * as AccountsAPITypes from "../../../../shared/api/accounts";
import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/accounts"
    : "/api/accounts";

// Create an Axios client with credentials enabled by default
const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true, // Always include credentials
});

export const categoriesApi = {
  async create(
    data: AccountsAPITypes.CreateRequestBody,
  ): Promise<AccountsAPITypes.CreateResponseData> {
    try {
      const response =
        await axiosClient.post<AccountsAPITypes.CreateResponseData>(
          "/create",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async get(
    data: AccountsAPITypes.GetRequestBody,
  ): Promise<AccountsAPITypes.GetResponseData> {
    try {
      const response = await axiosClient.post<AccountsAPITypes.GetResponseData>(
        "/get",
        data,
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async update(
    data: AccountsAPITypes.UpdateRequestBody,
  ): Promise<AccountsAPITypes.UpdateResponseData> {
    try {
      const response =
        await axiosClient.post<AccountsAPITypes.UpdateResponseData>(
          "/update",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async delete(
    data: AccountsAPITypes.DeleteRequestBody,
  ): Promise<AccountsAPITypes.DeleteResponseData> {
    try {
      const response =
        await axiosClient.post<AccountsAPITypes.DeleteResponseData>(
          "/delete",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async restore(
    data: AccountsAPITypes.RestoreRequestBody,
  ): Promise<AccountsAPITypes.RestoreResponseData> {
    try {
      const response =
        await axiosClient.post<AccountsAPITypes.RestoreResponseData>(
          "/restore",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async list(
    data: AccountsAPITypes.ListRequestBody,
  ): Promise<AccountsAPITypes.ListResponseData> {
    try {
      const response =
        await axiosClient.post<AccountsAPITypes.ListResponseData>(
          "/list",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default categoriesApi;
