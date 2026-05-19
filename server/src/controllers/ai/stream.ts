import { NextFunction, Response } from "express";
import { AbortableAsyncIterator, ChatResponse } from "ollama";

import { TypedRequest } from "../../types/index.js";

import OllamaChatService from "../../services/ollama/chat.js";
import LoggingService from "../../services/logging.js";
import WorkflowsRegistry from "../../services/workflows/registry.js";

import { buildAiPrompt } from "../../utils/ai/rag.js";

import { detectWorkflowIntent } from "../../utils/ai/workflows.js";
import { createSession, getActiveWorkflowSession, updateWorkflowSession, clearWorkflowSession } from "../../services/workflows/sessions.js";

import * as AIAPITypes from "../../../../shared/api/ai.js"

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

function writeWorkflowReply(res: Response, title: string, reply: { title: string; content: string; imageUrl?: string } | undefined) {
  if (!reply) {
    return;
  }

  if (reply.content) {
    writeSseEvent(res, "text", reply.content);
  }

  if (reply.imageUrl) {
    writeSseEvent(res, "image", {
      title: reply.title ?? title,
      url: reply.imageUrl,
    });
  }
}

function mergeWorkflowData(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existing,
    ...incoming,
  };
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
    const account = req.user!;

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

    const workflowsRegistry = WorkflowsRegistry.getInstance();
    await workflowsRegistry.initialize();

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

    // if (workflowSessionId) {
    //   const activeSession = await getActiveWorkflowSession(workflowSessionId);

    //   if (activeSession) {
    //     const execution = await workflowsRegistry.executeStep(
    //       activeSession.activeWorkflow,
    //       activeSession.currentStep,
    //       {
    //         prompt,
    //         chat,
    //         data: activeSession.data,
    //       },
    //     );

    //     if (execution) {
    //       const mergedData = mergeWorkflowData(
    //         activeSession.data,
    //         execution.data ?? {},
    //       );

    //       if (execution.nextStep) {
    //         await updateWorkflowSession(activeSession.sessionId, {
    //           currentStep: execution.nextStep,
    //           data: mergedData,
    //         });
    //       } else {
    //         await clearWorkflowSession(activeSession.sessionId);
    //       }

    //       writeSseEvent(res, "workflow_step", {
    //         title: "Workflow continued",
    //         workflow: activeSession.activeWorkflow,
    //         step: execution.nextStep ?? activeSession.currentStep,
    //       });

    //       writeWorkflowReply(res, "Workflow continued", execution.reply ?? undefined);
    //       endSseStream(res);
    //       return;
    //     }

    //     await clearWorkflowSession(activeSession.sessionId);
    //   }
    // }

    // const detectedIntent = await detectWorkflowIntent(prompt);

    // if (detectedIntent) {
    //   const workflowInfo = await workflowsRegistry.getWorkflowInfo(detectedIntent);
    //   const workflowSession = await createSession({
    //     accountId: account.id.toString(),
    //     workflow: detectedIntent,
    //     steps: workflowInfo?.steps,
    //     data: { prompt, chat },
    //   });

    //   const execution = await workflowsRegistry.executeStep(
    //     detectedIntent,
    //     workflowSession.currentStep,
    //     {
    //       prompt,
    //       chat,
    //       data: workflowSession.data,
    //     },
    //   );

    //   if (execution) {
    //     const mergedData = mergeWorkflowData(
    //       workflowSession.data,
    //       execution.data ?? {},
    //     );

    //     if (execution.nextStep) {
    //       await updateWorkflowSession(workflowSession.sessionId, {
    //         currentStep: execution.nextStep,
    //         data: mergedData,
    //       });
    //     } else {
    //       await clearWorkflowSession(workflowSession.sessionId);
    //     }

    //     writeSseEvent(res, "workflow_start", {
    //       title: "Workflow started",
    //       workflow: detectedIntent,
    //       workflowSessionId: workflowSession.sessionId,
    //       reply: execution.reply,
    //     });

    //     writeWorkflowReply(res, "Workflow started", execution.reply ?? undefined);
    //     endSseStream(res);
    //     return;
    //   }
    // }

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

      });
    }

    res.end();
  }
};

export default handler;
