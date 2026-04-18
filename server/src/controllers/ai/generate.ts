import { NextFunction, Response } from "express";

import { TypedRequest } from "../../types";

import OllamaChatService from "../../services/ollama/chat";
import OllamaEmbeddingService from "../../services/ollama/embed";
import { queryRagDocumentsByEmbedding } from "../../services/chroma/rag-documents/query";

import { ChatResponse, Message, Tool } from "ollama";
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
  result?: string;
};

const handler = async (
  req: TypedRequest<GenerateRequestBody>,
  res: Response<GenerateResponseData>,
  _next: NextFunction,
) => {
  const {
    prompt,
    chat,
    campuses,
    deliveryModes,
    category,
    tools,
    mcpServers,
  } = req.parsedBody;

  try {
    const queryEmbedding =
      await OllamaEmbeddingService.getInstance().embedText(prompt);

    const ragDocuments = await queryRagDocumentsByEmbedding(queryEmbedding, {
      nResults: 3,
      filters: {
        campuses,
        deliveryModes,
        category,
        includeArchived: false,
      },
    });
    console.log("RAG Documents retrieved for prompt:", ragDocuments);

    const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
      ragDocuments.documents.join("\n"),
      prompt,
    );

    const result: ChatResponse =
      await OllamaChatService.getInstance().generateChat<ChatResponse>({
        prompt: finalPrompt,
        chat,
        stream: false,
        options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
        tools,
        mcpServers: [
          {
            name: "Calendario Académico",
            description: "Proporciona información sobre eventos y fechas importantes en el calendario académico de la UNAH.",
            tools: [
              {
                function: {
                  description: "Obtiene una lista de eventos del calendario académico. No requiere parámetros.",
                  parameters: {
                    type: "object",
                    properties: {},
                  },
                  name: "get_calendar_events",
                  type: "function",
                },
                type: "tool",
              },
            ],
          }
        ],
      });

    res.status(200).json({ status: "success", result: result.message.content });

  } catch (error: unknown) {
    console.log(error)

    if (error instanceof Error) {
      // LoggingService.log({
      //   source: "api:rag-documents:delete",
      //   level: "error",
      //   message: "Error during cai deletion",
      //   traceId: req.traceId,
      //   details: {
      //     error: error.message,
      //     stack: error.stack,
      //   },
      //   metadata: {
      //     createdAt: new Date(),
      //     // createdBy: adminAccount._id,
      //   },
      // });
    }
    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
