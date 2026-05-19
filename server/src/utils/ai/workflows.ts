import { ChatResponse } from "ollama";

import OllamaChatService from "../../services/ollama/chat.js";
import WorkflowsRegistry from "../../services/workflows/registry.js";

import { WorkflowName } from "../../types/workflows.js";


function parseJsonObject(raw: string): Record<string, any> | null {
  const content = raw.trim();

  if (!content) {
    return null;
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() || content;

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : null;
  } catch {
    // Continue with best-effort extraction.
  }

  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      const parsed = JSON.parse(candidate.slice(first, last + 1));
      return parsed && typeof parsed === "object" ? parsed as Record<string, any> : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function detectWorkflowIntent(
  prompt: string,
): Promise<WorkflowName | null> {
  const workflowsRegistry = WorkflowsRegistry.getInstance();
  await workflowsRegistry.initialize();

  const intents = workflowsRegistry.getIntentCandidates();

  if (!intents.length) {
    return null;
  }

  const intentList = intents
    .map((workflow) => `${workflow.name}: ${workflow.description}`)
    .join("\n- ");

  try {
    const response = await OllamaChatService.getInstance().generateChat<ChatResponse>({
      prompt,
      chat: [],
      stream: false,
      options: { temperature: 0 },
      systemPrompt: `You classify whether the user is requesting a deterministic workflow.
Allowed intents: ${intentList}
Return ONLY valid JSON with shape: { "intent": string | null }.
Return null when the request does not clearly match any allowed intent.
Do not add extra keys.`,
    });

    console.log("[Workflow] detectWorkflowIntent raw response", {
      content: response.message.content,
    });

    const parsed = (parseJsonObject(response.message.content ?? "") ?? {}) as {
      intent?: string | null;
    };

    if (!parsed.intent) {
      return null;
    }

    const matched = workflowsRegistry.resolveIntent(parsed.intent);
    return matched?.name ?? null;
  } catch (error) {
    console.error("[Workflow] detectWorkflowIntent error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}