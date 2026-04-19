import { NextFunction, Response } from "express";
import { AbortableAsyncIterator, ChatResponse } from "ollama";

import { TypedRequest } from "../../types";

import OllamaChatService from "../../services/ollama/chat";
import LoggingService from "../../services/logging";

import { AiRequestBody, buildAiPrompt } from "../../utils/ai/rag";
import {
  buildToolContext,
  executeMcpToolCalls,
  resolveAiMcpCatalog,
} from "../../utils/ai/mcp";

const MAX_TOOL_CALL_ROUNDS = 4;

const handler = async (
  req: TypedRequest<AiRequestBody>,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { chat, tools } = req.parsedBody;
    const { finalPrompt } = await buildAiPrompt(req.parsedBody);
    const mcpCatalog = await resolveAiMcpCatalog(req.parsedBody.mcpServers);

    let composedPrompt = finalPrompt;
    let finalText = "";

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round += 1) {
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

      if (!toolCalls.length) {
        finalText = response.message.content?.trim() ?? "";
        break;
      }

      for (const toolCall of toolCalls) {
        res.write(`\n[Tool] Calling ${toolCall.function.name}...\n`);
      }

      const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);
      const toolContext = buildToolContext(toolExecutions);
      composedPrompt = [composedPrompt, toolContext].filter(Boolean).join("\n\n");

      for (const execution of toolExecutions) {
        res.write(`\n[Tool] ${execution.name} completed via ${execution.serverName}.\n`);
      }
    }

    if (finalText) {
      res.write(finalText);
      res.end();
      return;
    }

    composedPrompt = [
      composedPrompt,
      "Provide a final response to the user using the tool results above. Do not call tools.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result: AbortableAsyncIterator<ChatResponse> =
      await OllamaChatService.getInstance().generateChat<
        AbortableAsyncIterator<ChatResponse>
      >({
        prompt: composedPrompt,
        chat,
        stream: true,
        options: { temperature: 0.7, num_gpu: 9999, main_gpu: 0 },
        tools: [],
        mcpServers: [],
      });

    for await (const part of result) {
      try {
        const chunk = part.message.content ?? "";
        res.write(String(chunk));
      } catch (writeError) {
        console.error("Error writing chunk to response:", writeError);
        if (!res.headersSent) {
          res.status(500);
        }
        res.end();
        return;
      }
    }

    res.end();
  } catch (error) {
    console.error("Error generating chat response:", error);
    if (!res.headersSent) {
      res.status(500).json({ status: "internal-error" });
      return;
    }


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

    res.end();
  }
};

export default handler;
