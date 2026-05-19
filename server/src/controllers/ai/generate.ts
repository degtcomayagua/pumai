import { NextFunction, Response } from "express";
import { ChatResponse } from "ollama";

import { TypedRequest } from "../../types/index.js";

import LoggingService from "../../services/logging.js";
import OllamaChatService from "../../services/ollama/chat.js";
import WorkflowsRegistry from "../../services/workflows/registry.js";
import { createSession, getActiveWorkflowSession, updateWorkflowSession, clearWorkflowSession } from "../../services/workflows/sessions.js";
import { detectWorkflowIntent } from "../../utils/ai/workflows.js";

import {
  buildAiPrompt,
  AiRequestBody,
  AiResponseData,
} from "../../utils/ai/rag.js";
import {
  buildToolContext,
  executeMcpToolCalls,
  resolveAiMcpCatalog,
} from "../../utils/ai/mcp.js";

const MAX_TOOL_CALL_ROUNDS = 4;

function getWorkflowReplyText(reply?: { title: string; content: string; imageUrl?: string } | null): string {
  return reply?.content?.trim() ?? "";
}

const handler = async (
  req: TypedRequest<AiRequestBody>,
  res: Response<AiResponseData>,
  _next: NextFunction,
) => {
  const account = req.user!;
  const {
    chat,
    tools,
    prompt,
    workflowSessionId,
  } = req.parsedBody;

  try {
    const workflowsRegistry = WorkflowsRegistry.getInstance();
    await workflowsRegistry.initialize();

    if (account && workflowSessionId) {
      const activeSession = await getActiveWorkflowSession(workflowSessionId);

      if (activeSession) {
        const execution = await workflowsRegistry.executeStep(
          activeSession.activeWorkflow,
          activeSession.currentStep,
          {
            prompt,
            chat,
            data: activeSession.data,
          },
        );

        if (execution) {
          const mergedData = {
            ...(activeSession.data ?? {}),
            ...(execution.data ?? {}),
          };

          if (execution.nextStep) {
            await updateWorkflowSession(activeSession.sessionId, {
              currentStep: execution.nextStep,
              data: mergedData,
            });
          } else {
            await clearWorkflowSession(activeSession.sessionId);
          }

          res.status(200).json({
            status: "success",
            result: getWorkflowReplyText(execution.reply),
            workflowSessionId: execution.nextStep ? activeSession.sessionId : undefined,
            workflow: activeSession.activeWorkflow,
            currentStep: execution.nextStep ?? activeSession.currentStep,
          });
          return;
        }

        await clearWorkflowSession(activeSession.sessionId);
      }
    }

    const detectedIntent = account ? await detectWorkflowIntent(prompt) : null;

    if (account && detectedIntent) {
      const workflowInfo = await workflowsRegistry.getWorkflowInfo(detectedIntent);
      const workflowSession = await createSession({
        accountId: account.id.toString(),
        workflow: detectedIntent,
        steps: workflowInfo?.steps,
        data: { prompt, chat },
      });

      const execution = await workflowsRegistry.executeStep(
        detectedIntent,
        workflowSession.currentStep,
        {
          prompt,
          chat,
          data: workflowSession.data,
        },
      );

      if (execution) {
        const mergedData = {
          ...(workflowSession.data ?? {}),
          ...(execution.data ?? {}),
        };

        if (execution.nextStep) {
          await updateWorkflowSession(workflowSession.sessionId, {
            currentStep: execution.nextStep,
            data: mergedData,
          });
        } else {
          await clearWorkflowSession(workflowSession.sessionId);
        }

        res.status(200).json({
          status: "success",
          result: getWorkflowReplyText(execution.reply),
          workflowSessionId: execution.nextStep ? workflowSession.sessionId : undefined,
          workflow: detectedIntent,
          currentStep: execution.nextStep ?? workflowSession.currentStep,
        });
        return;
      }
    }

    const { finalPrompt, ragDocuments } = await buildAiPrompt(req.parsedBody.prompt);
    // MCP temporarily disabled for workflow/data-extraction performance tuning.
    // const mcpCatalog = await resolveAiMcpCatalog(req.parsedBody.mcpServers);

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
          tools: [],
          mcpServers: [],
        });

      const toolCalls = response.message.tool_calls ?? [];
      const content = response.message.content?.trim() ?? "";

      if (!toolCalls.length) {
        finalText = content;
        break;
      }

      // MCP temporarily disabled for workflow/data-extraction performance tuning.
      // const toolExecutions = await executeMcpToolCalls(toolCalls, mcpCatalog);
      const toolExecutions: Awaited<ReturnType<typeof executeMcpToolCalls>> = [];
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

      });
    }
    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;
