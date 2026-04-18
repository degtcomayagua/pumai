import axios from "axios";
import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/logs"
    : "/api/logs";

const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

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

export interface LogQueryParams {
  level?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  traceId?: string;
  page?: number;
  limit?: number;
}

export interface LogQueryResponse {
  status: string;
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const logsApi = {
  async query(params: LogQueryParams): Promise<LogQueryResponse> {
    try {
      const response = await axiosClient.post<LogQueryResponse>(
        "/query",
        params,
      );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async exportCSV(params: Omit<LogQueryParams, "page" | "limit">): Promise<Blob> {
    const response = await axiosClient.post("/export", params, {
      responseType: "blob",
    });
    return response.data;
  },
};

export default logsApi;
