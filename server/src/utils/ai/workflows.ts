import { ChatResponse } from "ollama";

import { getRedisClient } from "../../config/redis";
import OllamaChatService from "../../services/ollama/chat";
import { WorkflowSession } from "../../types/workflows";

import SumThreeNumbersWorkflow from "../../workflows/sumThreeNumbers";

const workflows = {
  sum_three_numbers: new SumThreeNumbersWorkflow(),
};

export type WorkflowIntent = keyof typeof workflows;

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

export function getWorkflowNames(): string[] {
  return Object.keys(workflows);
}

export function getWorkflows(): Record<string, SumThreeNumbersWorkflow> {
  return workflows;
}

export async function getActiveWorkflowSession(
  sessionId: string,
): Promise<WorkflowSession | null> {
  const redis = getRedisClient();
  const raw = await redis.get(`workflow:session:${sessionId}`);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Omit<WorkflowSession, "startedAt"> & {
      startedAt: string;
    };

    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
    };
  } catch {
    await redis.del(`workflow:session:${sessionId}`);
    return null;
  }
}

export async function detectWorkflowIntent(
  prompt: string,
): Promise<WorkflowIntent | null> {
  const intentList = getWorkflowNames().join(", ");

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

    return parsed.intent in workflows
      ? (parsed.intent as WorkflowIntent)
      : null;
  } catch (error) {
    console.error("[Workflow] detectWorkflowIntent error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}