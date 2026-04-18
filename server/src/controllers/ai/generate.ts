import { NextFunction, Response } from "express";

import { TypedRequest } from "../../types";

import OllamaChatService from "../../services/ollama/chat";
import { ChatResponse } from "ollama";

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

    const firstPass: ChatResponse =
      await OllamaChatService.getInstance().generateChat<ChatResponse>({
        prompt: finalPrompt,
        chat,
        stream: false,
        options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
        tools,
        mcpServers: mcpCatalog.servers,
      });

    const toolCalls = firstPass.message.tool_calls ?? [];

    if (!toolCalls.length) {
      res.status(200).json({ status: "success", result: firstPass.message.content });
      return;
    }

    const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);
    const toolContext = buildToolContext(toolExecutions);

    const finalResult: ChatResponse =
      await OllamaChatService.getInstance().generateChat<ChatResponse>({
        prompt: [finalPrompt, toolContext].filter(Boolean).join("\n\n"),
        chat,
        stream: false,
        options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
        tools,
      });

    res.status(200).json({ status: "success", result: finalResult.message.content });

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
