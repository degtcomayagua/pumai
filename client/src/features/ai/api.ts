import axios from "axios";

import type { AIAPITypes } from ".";

import ApiUtils from "../../utils/api";

const baseUrl =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_SERVER_URL + "/api/ai"
    : "/api/ai";

const axiosClient = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

async function readStreamText(
  response: Response,
  onChunk?: (chunk: string, fullText: string) => void,
) {
  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) {
      continue;
    }

    fullText += chunk;
    onChunk?.(chunk, fullText);
  }

  fullText += decoder.decode();

  return fullText;
}

async function parseErrorResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return { status: "internal-error" };
    }
  }

  return { status: "internal-error" };
}

export const api = {
  async generate(
    data: AIAPITypes.GenerateRequestBody,
  ): Promise<AIAPITypes.GenerateResponseData> {
    try {
      const response = await axiosClient.post<AIAPITypes.GenerateResponseData>(
        "/generate",
        data,
      );

      return response.data;
    } catch (error) {
      return ApiUtils.handleAxiosError(error);
    }
  },

  async generateStream(
    data: AIAPITypes.StreamRequestBody,
    options: AIAPITypes.GenerateStreamOptions = {},
  ): Promise<AIAPITypes.StreamResponseData> {
    try {
      const response = await fetch(`${baseUrl}/generate-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
        signal: options.signal,
      });

      if (!response.ok) {
        return (await parseErrorResponse(response)) as AIAPITypes.StreamResponseData;
      }

      const result = await readStreamText(response, options.onChunk);

      return {
        status: "success",
        result,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          status: "internal-error",
          result: "",
        };
      }

      return ApiUtils.handleAxiosError(error) as AIAPITypes.StreamResponseData;
    }
  },
};

export default api;