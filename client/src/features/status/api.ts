import axios from "axios";
import * as StatsAPITypes from "../../../../shared/types/api/stats";

import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/stats"
    : "/api/status";

const axiosClient = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Always include credentials
});

const statsAPI = {
  ping: async (
    data: StatsAPITypes.PingRequestBody,
  ): Promise<StatsAPITypes.PingResponseData> => {
    try {
      const response = await axiosClient.post(`/ping`, data, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default statsAPI;
