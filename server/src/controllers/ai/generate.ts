import { NextFunction, Response } from "express";
import { ChatResponse } from "ollama";

import { TypedRequest } from "../../types";

import LoggingService from "../../services/logging";
import OllamaChatService from "../../services/ollama/chat";

import {
  buildAiPrompt,
  AiRequestBody,
  AiResponseData,
} from "../../utils/ai/rag";
import {
  buildToolContext,
  executeMcpToolCalls,
  resolveAiMcpCatalog,
} from "../../utils/ai/mcp";

const MAX_TOOL_CALL_ROUNDS = 4;

const handler = async (
  req: TypedRequest<AiRequestBody>,
  res: Response<AiResponseData>,
  _next: NextFunction,
) => {
  const {
    prompt,
    chat,
    tools,
  } = req.parsedBody;

  try {
    const { finalPrompt, ragDocuments } = await buildAiPrompt(req.parsedBody);
    const mcpCatalog = await resolveAiMcpCatalog(req.parsedBody.mcpServers);

    console.log("RAG Documents retrieved for prompt:", ragDocuments);

    const toolContexts: string[] = [];
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round += 1) {
      const composedPrompt = [finalPrompt, ...toolContexts].filter(Boolean).join("\n\n");

      const response: ChatResponse =
        await OllamaChatService.getInstance().generateChat<ChatResponse>({
          prompt: composedPrompt,
          chat,
          stream: false,
          options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
          tools,
          mcpServers: mcpCatalog.servers,
        });

      const toolCalls = response.message.tool_calls ?? [];
      const content = response.message.content?.trim() ?? "";

      if (!toolCalls.length) {
        finalText = content;
        break;
      }

      const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);
      toolContexts.push(buildToolContext(toolExecutions));
    }

    if (!finalText) {
      const fallbackPrompt = [
        finalPrompt,
        ...toolContexts,
        "Provide a final response to the user using the tool results above. Do not call tools.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const fallbackResponse: ChatResponse =
        await OllamaChatService.getInstance().generateChat<ChatResponse>({
          prompt: fallbackPrompt,
          chat,
          stream: false,
          options: { temperature: 0.7, num_gpu: 9999, main_gpu: 0 },
          tools: [],
          mcpServers: [],
        });

      finalText = fallbackResponse.message.content?.trim() ?? "";
    }

    res.status(200).json({ status: "success", result: finalText });

  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:delete",
        level: "error",
        message: "Error during cai deletion",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
        metadata: {
          createdAt: new Date(),
          // createdBy: adminAccount._id,
        },
      });
    }
    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
