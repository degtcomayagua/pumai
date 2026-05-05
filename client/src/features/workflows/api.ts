import axios from "axios";
import {
  WorkflowsAPITypes,
} from ".";
import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/workflows"
    : "/api/workflows";

// Create an Axios client with credentials enabled by default
const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true, // Always include credentials
});

export const workflowsAPI = {
  async create(
    data: WorkflowsAPITypes.CreateRequestBody,
  ): Promise<WorkflowsAPITypes.CreateResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.CreateResponseData>(
          "/create",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async get(
    data: WorkflowsAPITypes.GetRequestBody,
  ): Promise<WorkflowsAPITypes.GetResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.GetResponseData>(
          "/get",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async update(
    data: WorkflowsAPITypes.UpdateRequestBody,
  ): Promise<WorkflowsAPITypes.UpdateResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.UpdateResponseData>(
          "/update",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async delete(
    data: WorkflowsAPITypes.DeleteRequestBody,
  ): Promise<WorkflowsAPITypes.DeleteResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.DeleteResponseData>(
          "/delete",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async restore(
    data: WorkflowsAPITypes.RestoreRequestBody,
  ): Promise<WorkflowsAPITypes.RestoreResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.RestoreResponseData>(
          "/restore",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async list(
    data: WorkflowsAPITypes.ListRequestBody,
  ): Promise<WorkflowsAPITypes.ListResponseData> {
    try {
      const response =
        await axiosClient.post<WorkflowsAPITypes.ListResponseData>(
          "/list",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default workflowsAPI;
