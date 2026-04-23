import axios from "axios";

import type { AIAPITypes } from ".";
import type { StreamChunk } from "../../../../shared/api/ai";

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
  onChunk?: (chunk: StreamChunk, fullText: string) => void,
) {
  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isSse = contentType.includes("text/event-stream");

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) {
      continue;
    }

    if (!isSse) {
      fullText += chunk;
      onChunk?.({ event: "text", data: chunk }, fullText);
      continue;
    }

    buffer += chunk;

    while (true) {
      const frameEnd = buffer.indexOf("\n\n");
      if (frameEnd === -1) {
        break;
      }

      const rawFrame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);

      const lines = rawFrame.replace(/\r\n/g, "\n").split("\n");
      let eventName = "message";
      const dataParts: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const rawData = line.slice(5);
          // SSE allows a single optional space after the colon; preserve all other whitespace.
          dataParts.push(rawData.startsWith(" ") ? rawData.slice(1) : rawData);
        }
      }

      if (eventName === "done") {
        continue;
      }

      const data = dataParts.join("\n");
      if (eventName === "text") {
        fullText += data;
      }

      onChunk?.({ event: eventName, data }, fullText);
    }
  }

  const trailing = decoder.decode();
  if (!isSse && trailing) {
    fullText += trailing;
  }

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