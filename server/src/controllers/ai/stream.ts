import { NextFunction, Response } from "express";
import { AbortableAsyncIterator, ChatResponse } from "ollama";

import { TypedRequest } from "../../types";

import OllamaChatService from "../../services/ollama/chat";
import LoggingService from "../../services/logging";

import { buildAiPrompt } from "../../utils/ai/rag";

import { detectWorkflowIntent, } from "../../utils/ai/workflows";
import { getWorkflows } from "../../services/workflows/repository";
import { createSession, getActiveWorkflowSession } from "../../services/workflows/sessions";

import { IAccount } from "../../../../shared/models/account";

import * as AIAPITypes from "../../../../shared/api/ai"

type StreamEventName = AIAPITypes.StreamChunk["event"];

function writeSseEvent(
  res: Response,
  event: StreamEventName,
  data: string | Record<string, unknown>,
) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);

  const lines = String(payload).replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    res.write(`data: ${line}\n`);
  }

  res.write("\n");
}

function endSseStream(res: Response) {
  writeSseEvent(res, "done", "[DONE]");
  res.end();
}

async function writeStreamResponse(
  res: Response,
  result: AbortableAsyncIterator<ChatResponse>,
) {
  for await (const part of result) {
    try {
      const chunk = part.message.content ?? "";
      if (chunk) {
        writeSseEvent(res, "text", chunk);
      }
      (res as Response & { flush?: () => void }).flush?.();
    } catch (writeError) {
      console.error("Error writing chunk to response:", writeError);
      if (!res.headersSent) {
        res.status(500);
      }
      res.end();
      return;
    }
  }

  endSseStream(res);
}

const handler = async (
  req: TypedRequest<AIAPITypes.StreamRequestBody>,
  res: Response,
  _next: NextFunction,
) => {
  try {
    // Allow no workflows to be executed by people not logged in.
    const account = req.user as IAccount | undefined;

    const {
      chat,
      prompt,
      campuses,
      deliveryModes,
      category,
      mcpServers,
      tools,
      workflowSessionId,
    } = req.parsedBody;

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Transfer-Encoding", "chunked");
    res.socket?.setNoDelay(true);
    res.flushHeaders?.();

    if (prompt.trim() === "__stream_demo__") {
      writeSseEvent(res, "system", "Stream demo started");
      writeSseEvent(res, "workflow_start", {
        title: "Workflow started",
        workflow: "demo-workflow",
      });
      writeSseEvent(res, "workflow_step", {
        title: "Workflow step",
        workflow: "demo-workflow",
        step: "Collecting inputs",
      });
      writeSseEvent(res, "tool_call", {
        title: "Tool call",
        name: "fetch-academic-calendar",
        arguments: { campus: "COMAYAGUA" },
      });
      writeSseEvent(res, "image", {
        title: "Demo image",
        url: "https://placehold.co/640x320/png",
      });
      writeSseEvent(res, "text", "First streamed text chunk.\nWith a newline.");
      writeSseEvent(res, "text", "Second streamed text chunk.");
      endSseStream(res);
      return;
    }

    // Common
    const { finalPrompt } = await buildAiPrompt(
      prompt,
      {
        rag: true,
      },
      {
        campuses,
        category,
        deliveryModes,
        includeArchived: false,
      },
    );

    // #region Not Logged In
    if (!account) {
      // Answer regularly when no account, as workflows require an account to operate.
      // Use solely RAG and basic MCP tool calls, without workflow orchestration.

      const result = await OllamaChatService.getInstance().generateChat<
        AbortableAsyncIterator<ChatResponse>
      >({
        prompt: finalPrompt,
        chat,
        stream: true,
        options: { temperature: 0.2, num_gpu: 999 },
        tools: [],
        mcpServers: [],
      });

      await writeStreamResponse(res, result);
      return;
    }
    // #endregion Not Logged In

    // #region Logged In
    // For logged in users, the same as above but with access to workflows and more advanced MCP tool calls.

    // 1. Check for active workflow sessions. If exists, continue with the workflow instead of answering regularly.
    const activeSession = workflowSessionId
      ? await getActiveWorkflowSession(workflowSessionId)
      : null;

    console.log(activeSession, workflowSessionId)

    if (activeSession) {
      const workflows = getWorkflows();
      const workflow = workflows[activeSession.activeWorkflow];

      if (workflow) {
        console.log("[Workflow] Continue", {
          workflowUserId: account._id,
          workflowSessionId,
          workflow: activeSession.activeWorkflow,
        });
      }

      // TODO: implement workflow continuation logic here, including executing the current step handler and streaming the response back to the user.

      writeSseEvent(res, "workflow_step", {
        title: "Workflow step",
        workflow: activeSession.activeWorkflow,
        sessionId: workflowSessionId,
        note: "Workflow continuation is not implemented yet.",
      });
      endSseStream(res);

      return;
    }

    // 2. If no active workflow session, attempt to detect intent and start a new workflow if intent is detected.
    const detectedIntent = await detectWorkflowIntent(prompt);
    if (detectedIntent) {
      const workflows = getWorkflows();
      const workflow = workflows[detectedIntent];

      if (workflow) {
        const createdWorkflow = new workflow();
        const workflowSession = createSession({
          accountId: account._id,
          workflow: detectedIntent,
        });

        console.log(workflowSession)

        const workflowReply = await createdWorkflow.start(workflowSession, prompt);

        writeSseEvent(res, "workflow_start", {
          title: "Workflow started",
          workflow: detectedIntent,
          workflowSessionId: workflowSession.sessionId,
          reply: workflowReply,
        });

        writeSseEvent(res, "text", "Ingresa el primer número");
        endSseStream(res);
        return;
      }
    }

    // 3. If no intent is detected, answer regularly with RAG and basic MCP tool calls, without workflow orchestration.
    const result = await OllamaChatService.getInstance().generateChat<
      AbortableAsyncIterator<ChatResponse>
    >({
      prompt: finalPrompt,
      chat,
      stream: true,
      options: { temperature: 0.2, num_gpu: 999 },
      tools: [],
      mcpServers: [],
    });

    await writeStreamResponse(res, result);

    //#endregion Logged In
    return;

    // for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round += 1) {
    //   const response: ChatResponse =
    //     await OllamaChatService.getInstance().generateChat<ChatResponse>({
    //       prompt: composedPrompt,
    //       chat,
    //       stream: false,
    //       options: { temperature: 0.2, num_gpu: 9999, main_gpu: 0 },
    //       tools: [],
    //       mcpServers: [],
    //     });

    //   const toolCalls = response.message.tool_calls ?? [];

    //   if (!toolCalls.length) {
    //     finalText = response.message.content?.trim() ?? "";
    //     break;
    //   }

    //   for (const toolCall of toolCalls) {
    //     writeSseData(res, `\n[Tool] Calling ${toolCall.function.name}...\n`);
    //   }
    //   (res as Response & { flush?: () => void }).flush?.();

    //   // MCP temporarily disabled for workflow/data-extraction performance tuning.
    //   // const toolExecutions = toolCalls.length
    //   //   ? await executeMcpToolCalls(toolCalls, mcpCatalog)
    //   //   : [];
    //   const toolExecutions: Awaited<ReturnType<typeof executeMcpToolCalls>> = [];

    //   if (!toolExecutions.length) {
    //     finalText = response.message.content?.trim() ?? "";
    //     break;
    //   }

    //   const toolContext = buildToolContext(toolExecutions);
    //   composedPrompt = [composedPrompt, toolContext].filter(Boolean).join("\n\n");

    //   for (const execution of toolExecutions) {
    //     writeSseData(res, `\n[Tool] ${execution.name} completed via ${execution.serverName}.\n`);
    //   }
    //   (res as Response & { flush?: () => void }).flush?.();
    // }

    // if (finalText) {
    //   writeSseData(res, finalText);
    //   res.write("event: done\ndata: [DONE]\n\n");
    //   res.end();
    //   return;
    // }

    // composedPrompt = [
    //   composedPrompt,
    //   "Provide a final response to the user using the tool results above. Do not call tools.",
    // ]
    //   .filter(Boolean)
    //   .join("\n\n");

    // const result: AbortableAsyncIterator<ChatResponse> =
    //   await OllamaChatService.getInstance().generateChat<
    //     AbortableAsyncIterator<ChatResponse>
    //   >({
    //     prompt: composedPrompt,
    //     chat,
    //     stream: true,
    //     options: { temperature: 0.7, num_gpu: 9999, main_gpu: 0 },
    //     tools: [],
    //     mcpServers: [],
    //   });

    // await writeStreamResponse(res, result);
    // return;
  } catch (error) {
    console.error("Error generating chat response:", error);
    if (!res.headersSent) {
      res.status(500).json({ status: "internal-error" });
      return;
    }

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:ai:stream",
        level: "error",
        message: "Error during AI streaming",
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
