import axios from "axios";
import {
  MCPServersAPITypes,
} from "./";
import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/mcp-servers"
    : "/api/mcp-servers";

// Create an Axios client with credentials enabled by default
const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true, // Always include credentials
});

export const mcpServerAPI = {
  async create(
    data: MCPServersAPITypes.CreateRequestBody,
  ): Promise<MCPServersAPITypes.CreateResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.CreateResponseData>(
          "/create",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async get(
    data: MCPServersAPITypes.GetRequestBody,
  ): Promise<MCPServersAPITypes.GetResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.GetResponseData>(
          "/get",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async update(
    data: MCPServersAPITypes.UpdateRequestBody,
  ): Promise<MCPServersAPITypes.UpdateResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.UpdateResponseData>(
          "/update",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async delete(
    data: MCPServersAPITypes.DeleteRequestBody,
  ): Promise<MCPServersAPITypes.DeleteResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.DeleteResponseData>(
          "/delete",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async restore(
    data: MCPServersAPITypes.RestoreRequestBody,
  ): Promise<MCPServersAPITypes.RestoreResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.RestoreResponseData>(
          "/restore",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async list(
    data: MCPServersAPITypes.ListRequestBody,
  ): Promise<MCPServersAPITypes.ListResponseData> {
    try {
      const response =
        await axiosClient.post<MCPServersAPITypes.ListResponseData>(
          "/list",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default mcpServerAPI;
