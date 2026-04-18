import { NextFunction, Response } from "express";

import { TypedRequest } from "../../types";
import OllamaChatService from "../../services/ollama/chat";
import OllamaEmbeddingService from "../../services/ollama/embed";
import { AbortableAsyncIterator, ChatResponse, Message, Tool } from "ollama";
import {
  CampusCode,
  DeliveryMode,
  DocumentCategory,
} from "../../../../shared/models";

type GenerateRequestBody = {
  prompt: string;
  chat: Message[];
  campuses: CampusCode[];
  deliveryModes: DeliveryMode[];
  category?: DocumentCategory;
  tools?: Tool[];
  mcpServers?: {
    name: string;
    description?: string;
    tools: Tool[];
  }[];
};

type GenerateResponseData = {
  status: "success" | "internal-error";
  result: string;
};

const handler = async (
  req: TypedRequest<GenerateRequestBody>,
  res: Response<GenerateResponseData>,
  _next: NextFunction,
) => {
  try {
    const {
      prompt,
      campuses,
      deliveryModes,
      category,
      tools,
      mcpServers,
    } = req.parsedBody;

    const context =
      await OllamaEmbeddingService.getInstance().getContext(prompt, 3, {
        campuses,
        deliveryModes,
        category,
        includeArchived: false,
      });

    const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
      context.documents.join("\n"),
      prompt,
    );

    const result: AbortableAsyncIterator<ChatResponse> =
      await OllamaChatService.getInstance().generateChat<
        AbortableAsyncIterator<ChatResponse>
      >({
        prompt: finalPrompt,
        chat: [],
        stream: true,
        options: { temperature: 0.2 },
        tools,
        mcpServers,
      });

    res.status(200);

    for await (const part of result) {
      try {
        const chunk: string = part.message.content as string;
        res.write(chunk);
      } catch (writeError) {
        console.error("Error writing chunk to response:", writeError);
        res.status(500).send({ status: "internal-error", result: "" });
        return;
      }
    }

    res.end();
  } catch (error) {
    console.error("Error generating chat response:", error);
    res.status(500).send({ status: "internal-error", result: "" });
  }
};

export default handler;
