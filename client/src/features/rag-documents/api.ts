import axios from "axios";
import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents";
import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/rag-documents"
    : "/api/rag-documents";

// Create an Axios client with credentials enabled by default
const axiosClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true, // Always include credentials
});

export const ragDocumentApi = {
  async create(
    data: RAGDocumentsAPITypes.CreateRequestBody,
  ): Promise<RAGDocumentsAPITypes.CreateResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.CreateResponseData>(
          "/create",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async get(
    data: RAGDocumentsAPITypes.GetRequestBody,
  ): Promise<RAGDocumentsAPITypes.GetResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.GetResponseData>(
          "/get",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async update(
    data: RAGDocumentsAPITypes.UpdateRequestBody,
  ): Promise<RAGDocumentsAPITypes.UpdateResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.UpdateResponseData>(
          "/update",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async delete(
    data: RAGDocumentsAPITypes.DeleteRequestBody,
  ): Promise<RAGDocumentsAPITypes.DeleteResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.DeleteResponseData>(
          "/delete",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async restore(
    data: RAGDocumentsAPITypes.RestoreRequestBody,
  ): Promise<RAGDocumentsAPITypes.RestoreResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.RestoreResponseData>(
          "/restore",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async list(
    data: RAGDocumentsAPITypes.ListRequestBody,
  ): Promise<RAGDocumentsAPITypes.ListResponseData> {
    try {
      const response =
        await axiosClient.post<RAGDocumentsAPITypes.ListResponseData>(
          "/list",
          data,
        );
      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },
};

export default ragDocumentApi;
