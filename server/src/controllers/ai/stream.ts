import { NextFunction, Response } from "express";

import { TypedRequest } from "../../types";

import OllamaChatService from "../../services/ollama/chat";
import { AbortableAsyncIterator, ChatResponse } from "ollama";
import { AiRequestBody, buildAiPrompt } from "../../utils/ai/rag";
import {
  buildToolContext,
  executeMcpToolCalls,
  resolveAiMcpCatalog,
} from "../../utils/ai/mcp";

const handler = async (
  req: TypedRequest<AiRequestBody>,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { chat, tools } = req.parsedBody;
    const { finalPrompt } = await buildAiPrompt(req.parsedBody);
    const mcpCatalog = await resolveAiMcpCatalog(req.parsedBody.mcpServers);

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

    let composedPrompt = finalPrompt;

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (toolCalls.length) {
      for (const toolCall of toolCalls) {
        res.write(`\n[Tool] Calling ${toolCall.function.name}...\n`);
      }

      const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);
      const toolContext = buildToolContext(toolExecutions);
      composedPrompt = [finalPrompt, toolContext].filter(Boolean).join("\n\n");

      for (const execution of toolExecutions) {
        res.write(`\n[Tool] ${execution.name} completed via ${execution.serverName}.\n`);
      }
    }

    const result: AbortableAsyncIterator<ChatResponse> =
      await OllamaChatService.getInstance().generateChat<
        AbortableAsyncIterator<ChatResponse>
      >({
        prompt: composedPrompt,
        chat,
        stream: true,
        options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
        tools,
        mcpServers: toolCalls.length ? [] : mcpCatalog.servers,
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

    res.end();
  }
};

export default handler;
