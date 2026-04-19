import axios from "axios";
import ApiUtils from "../../utils/api";

import type { LogsAPITypes } from "."

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/logs"
    : "/api/logs";

const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

export const logsApi = {
  async list(params: LogsAPITypes.ListRequestBody): Promise<LogsAPITypes.ListResponseData> {
    try {
      const response = await axiosClient.post<LogsAPITypes.ListResponseData>(
        "/list",
        params,
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async get(params: LogsAPITypes.GetRequestBody): Promise<LogsAPITypes.GetResponseData> {
    try {
      const response = await axiosClient.post<LogsAPITypes.GetResponseData>(
        "/get",
        params,
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export interface LogEntry {
  _id: string;
  date: string;
  level: string;
  source: string;
  message: string;
  traceId?: string;
  duration?: number;
  details?: Record<string, any>;
  _references?: Record<string, string>;
}

export default logsApi;
