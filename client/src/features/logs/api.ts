import axios from "axios";
import * as LogsAPITypes from "../../../../shared/types/api/logs";

import ApiUtils from "../../utils/api";
import { getTerminalFingerPrint } from "../../utils/terminals";

const baseUrl =
	import.meta.env.MODE === "development"
		? import.meta.env.VITE_SERVER_URL + "/api/logs"
		: "/api/logs";

const axiosClient = axios.create({
	baseURL: baseUrl,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

axiosClient.interceptors.request.use(async (config) => {
	const fingerprint = await getTerminalFingerPrint();
	config.headers["x-device-fingerprint"] = fingerprint;
	return config;
});

export const logsApi = {
	async get(
		data: LogsAPITypes.GetRequestBody,
	): Promise<LogsAPITypes.GetResponseData> {
		try {
			const response = await axiosClient.post<LogsAPITypes.GetResponseData>(
				"/get",
				data,
			);

			return response.data;
		} catch (error) {
			return ApiUtils.handleAxiosError(error);
		}
	},

	async list(
		data: LogsAPITypes.ListRequestBody,
	): Promise<LogsAPITypes.ListResponseData> {
		try {
			const response = await axiosClient.post<LogsAPITypes.ListResponseData>(
				"/list",
				data,
			);

			return response.data;
		} catch (error) {
			return ApiUtils.handleAxiosError(error);
		}
	},
};

export default logsApi;
