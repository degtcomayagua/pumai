import { NextFunction, Response } from "express";
import { AbortableAsyncIterator, ChatResponse } from "ollama";

import { TypedRequest } from "../../types/index.js";

import OllamaChatService from "../../services/ollama/chat.js";
import LoggingService from "../../services/logging.js";
import {
  clearWorkflowSession,
  createWorkflowSession,
  getActiveWorkflowSession,
  updateWorkflowSession,
} from "../../services/workflows/sessions.js";
import {
  executeWorkflowStep,
  getWorkflow,
} from "../../services/workflows/registry.js";

import { buildAiPrompt } from "../../utils/ai/rag.js";

import { detectWorkflowIntent } from "../../utils/ai/workflows.js";

import {
  resolveAiMcpCatalog,
  executeMcpToolCalls,
  buildToolContext,
} from "../../utils/ai/mcp.js";

import * as AIAPITypes from "../../../../shared/api/ai.js";

type StreamEventName = AIAPITypes.StreamChunk["event"];
const MAX_TOOL_CALL_ROUNDS = 5;

function writeSseEvent(
  res: Response,
  event: StreamEventName,
  data: string | Record<string, unknown>,
) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  console.log(payload);

  // Write event header
  let canContinue = res.write(`event: ${event}\n`);
  if (!canContinue) {
    console.warn(`[Stream] Write buffer full after event header`);
  }

  // Write data lines
  const lines = String(payload).replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    canContinue = res.write(`data: ${line}\n`);
    if (!canContinue) {
      console.warn(`[Stream] Write buffer full while writing data line`);
    }
  }

  // Write event separator
  canContinue = res.write("<<EVENT SEPARATOR>>");
  if (!canContinue) {
    console.warn(`[Stream] Write buffer full after event separator`);
  }
}

function flushSseStream(res: Response) {
  const httpRes = res as Response & { flush?: () => void };
  httpRes.flush?.();
}

function endSseStream(res: Response) {
  writeSseEvent(res, "done", "[DONE]");
  res.end();
}

async function writeStreamResponse(
  res: Response,
  result: AbortableAsyncIterator<ChatResponse>,
) {
  let previousContent = "";
  for await (const part of result) {
    try {
      const chunk = part.message.content ?? "";
      if (!chunk) {
        flushSseStream(res);
        continue;
      }

      console.log(`[Stream] Generated chunk: ${chunk}`); // Log the generated chunk for debugging

      // Some streaming providers return the full accumulated content on
      // each iteration. To avoid sending duplicate text to the client
      // (which causes the frontend to display repeated content), compute
      // the suffix (delta) compared to previously sent content and only
      // stream that.
      let delta = chunk;
      if (chunk.startsWith(previousContent)) {
        delta = chunk.slice(previousContent.length);
      }

      if (delta) {
        writeSseEvent(res, "text", delta);
      }

      previousContent = chunk;
      flushSseStream(res);
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

async function writeStreamResponseWithMcpTools(
  res: Response,
  prompt: string,
  chat: ChatResponse["message"][],
  finalPrompt: string,
  mcpCatalog: Awaited<ReturnType<typeof resolveAiMcpCatalog>>,
) {
  let composedPrompt = finalPrompt;

  for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round += 1) {
    const response: ChatResponse =
      await OllamaChatService.getInstance().generateChat<ChatResponse>({
        prompt: composedPrompt,
        chat,
        stream: false,
        options: { temperature: 0.2, num_gpu: 999 },
        tools: [],
        mcpServers: mcpCatalog.servers,
      });

    const toolCalls = response.message.tool_calls ?? [];

    if (!toolCalls.length) {
      // No tool calls, stream the response content
      const content = response.message.content?.trim() ?? "";
      if (content) {
        writeSseEvent(res, "text", content);
      }
      flushSseStream(res);
      endSseStream(res);
      return;
    }

    // Send tool call events and execute them
    for (const toolCall of toolCalls) {
      writeSseEvent(res, "tool_call", {
        title: "Tool call",
        name: toolCall.function.name,
        arguments: toolCall.function.arguments ?? {},
      });
    }
    flushSseStream(res);

    // Execute all tool calls
    const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);

    if (!toolExecutions.length) {
      // If no tools were executed, stream what we have and exit
      const content = response.message.content?.trim() ?? "";
      if (content) {
        writeSseEvent(res, "text", content);
      }
      flushSseStream(res);
      endSseStream(res);
      return;
    }

    // Build context from tool results and append to prompt
    const toolContext = buildToolContext(toolExecutions);
    composedPrompt = [composedPrompt, toolContext].filter(Boolean).join("\n\n");

    // Send tool completion events
    for (const execution of toolExecutions) {
      writeSseEvent(res, "system", {
        message: `Tool ${execution.name} completed via ${execution.serverName}.`,
      });
    }
    flushSseStream(res);

    // Update chat history with assistant response and tool results
    chat.push(response.message);
    chat.push({
      role: "user",
      content: toolContext,
    });
  }

  // After MAX_TOOL_CALL_ROUNDS, request final response without tool calls
  composedPrompt = [
    composedPrompt,
    "Provide a final response to the user based on the tool results above. Do not call tools.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const finalResult: AbortableAsyncIterator<ChatResponse> =
    await OllamaChatService.getInstance().generateChat<
      AbortableAsyncIterator<ChatResponse>
    >({
      prompt: composedPrompt,
      chat,
      stream: true,
      options: { temperature: 0.2, num_gpu: 999 },
      tools: [],
      mcpServers: [],
    });

  await writeStreamResponse(res, finalResult);
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

    // Set up the required headers to stream SSE
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Transfer-Encoding", "chunked");
    res.socket?.setNoDelay(true);
    res.flushHeaders?.();

    // Test case to demonstrate streaming various event types without going through the full workflow/AI logic
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

    // Common, generate the system prompt with a call RAG for relevant information
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

    // First fetch the current session ID given what the frontend provides
    const activeSession = workflowSessionId
      ? await getActiveWorkflowSession(workflowSessionId)
      : null;

    if (activeSession) {
      // Get the current workflow
      const workflow = getWorkflow(activeSession.activeWorkflow);
      if (workflow) {
        try {
          const workflowResult = await executeWorkflowStep(
            activeSession.activeWorkflow,
            activeSession.currentStep,
            prompt,
          );

          // If the current workflow says its time to stop, then clear the session.
          if (workflowResult.nextStep === null) {
            await clearWorkflowSession(activeSession.sessionId);
          } else {
            await updateWorkflowSession(activeSession.sessionId, {
              currentStep: workflowResult.nextStep,
              data: {
                ...activeSession.data,
                lastUserInput: prompt,
              },
            });
          }

          // Send the results of executing the steps
          for (const reply of workflowResult.replies) {
            writeSseEvent(res, "workflow_step", JSON.stringify(reply));
            writeSseEvent(res, "separator", "");
          }
          endSseStream(res);
          return;
        } catch (error) {
          writeSseEvent(res, "system", {
            message: `Error executing workflow step: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          endSseStream(res);
          return;
        }
      }

      // If somehow we arrive here, it means there's an active session that doesn't correspond to a valid workflow. Clear it to avoid blocking the user.
      await clearWorkflowSession(activeSession.sessionId);
    }

    // If there was no active workflow at the moment the user sent a message
    // Detect the current intent of the message given the registered workflows
    const detectedIntent = await detectWorkflowIntent(prompt);
    if (detectedIntent) {
      // If there was indeed a workflow detected, then find its declaration in the registry
      const workflow = getWorkflow(detectedIntent);

      // If the registry returns a proper workflow create a workflow session and execute the first step
      if (workflow) {
        try {
          const workflowSession = await createWorkflowSession({
            accountId: account.id.toString(),
            workflow: detectedIntent,
            currentStep: workflow.firstStep,
            data: {
              lastUserInput: prompt,
            },
          });

          const workflowResult = await executeWorkflowStep(
            detectedIntent,
            workflow.firstStep,
            prompt,
          );

          // If the workflow has more than one step, update the current workflow session to be the next step.
          if (workflowResult.nextStep === null) {
            await clearWorkflowSession(workflowSession.sessionId);
          } else {
            await updateWorkflowSession(workflowSession.sessionId, {
              currentStep: workflowResult.nextStep,
              data: {
                lastUserInput: prompt,
              },
            });
          }

          // Send workflow start event
          writeSseEvent(res, "workflow_start", {
            title: workflow.description,
            workflow: detectedIntent,
            workflowSessionId: workflowSession.sessionId,
          });
          flushSseStream(res);

          // Send workflow step event if there's a next step
          if (workflowResult.nextStep !== null) {
            writeSseEvent(res, "workflow_step", {
              title: workflow.description,
              workflow: detectedIntent,
              step: workflowResult.nextStep,
            });
            flushSseStream(res);
          }

          // Send the results of executing the steps
          for (const reply of workflowResult.replies) {
            writeSseEvent(res, "workflow_step", JSON.stringify(reply));
            writeSseEvent(res, "separator", "");
          }
          endSseStream(res);
          return;
        } catch (error) {
          writeSseEvent(res, "system", {
            message: `Error executing workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          endSseStream(res);
          return;
        }
      }
    }

    // Resolve MCP catalog for tool calling
    const mcpCatalog = await resolveAiMcpCatalog(mcpServers ?? []);

    // If no intent is detected, answer with RAG and MCP tools (if available)
    if (mcpCatalog.servers.length > 0) {
      // Use MCP tool calling with multiple rounds
      await writeStreamResponseWithMcpTools(
        res,
        prompt,
        chat,
        finalPrompt,
        mcpCatalog,
      );
    } else {
      // Answer regularly with RAG and streaming, no MCP tools
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
    }

    //#endregion Logged In
    return;
  } catch (error) {
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
