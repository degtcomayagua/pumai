import { ChatResponse } from "ollama";

import OllamaChatService from "../../services/ollama/chat";
import { getRedisClient } from "../../config/redis";

import { WorkflowSession, WorkflowStepResult, StepHandler } from "../../types/workflows";

export type WorkflowExtractionResult = {
  wants_to_exit: boolean;
  next_step: string | null;
  data: Record<string, any>;
};

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

function normalizeExtraction(raw: Record<string, any> | null): WorkflowExtractionResult {
  if (!raw) {
    return {
      wants_to_exit: false,
      next_step: null,
      data: {},
    };
  }

  const wantsToExit = raw.wants_to_exit === true;
  const nextStep = typeof raw.next_step === "string" && raw.next_step.trim().length > 0
    ? raw.next_step.trim()
    : null;
  const data = raw.data && typeof raw.data === "object" ? raw.data : {};

  return {
    wants_to_exit: wantsToExit,
    next_step: nextStep,
    data,
  };
}

export abstract class WorkflowBase {
  /** Unique identifier — must match intent classifier output */
  abstract readonly name: string;

  /**
   * JSON schema description for the `data` field extracted by the LLM.
   * Describe every field the workflow might need, all nullable.
   */
  abstract readonly extractionSchema: string;

  /**
   * Message shown when the user cancels mid-workflow.
   * Override to customize per workflow.
   */
  readonly cancelMessage: string = "Entendido, cancelado. ¿En qué más te puedo ayudar?";

  /**
   * Session TTL in milliseconds. Defaults to 10 minutes.
   * After this, the session is considered stale and cleared.
   */
  readonly sessionTTLMs: number = 10 * 60 * 1000;

  /** All step handlers keyed by step name */
  abstract readonly steps: Record<string, StepHandler>;

  /**
   * Given extracted workflow data from the current message,
   * return the name of the first step to run.
   */
  abstract buildInitialStep(extracted: Record<string, any>): string;

  // ─── Session (Redis-backed) ───────────────────────────────────────────────
  private getSessionKey(userId: string): string {
    return `workflow:session:${userId}`;
  }

  async getSession(userId: string): Promise<WorkflowSession | null> {
    const redis = getRedisClient();
    const raw = await redis.get(this.getSessionKey(userId));

    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Omit<WorkflowSession, "startedAt"> & { startedAt: string };
      return {
        ...parsed,
        startedAt: new Date(parsed.startedAt),
      };
    } catch {
      await redis.del(this.getSessionKey(userId));
      return null;
    }
  }

  async setSession(session: WorkflowSession): Promise<void> {
    const redis = getRedisClient();
    await redis.set(this.getSessionKey(session.userId), JSON.stringify({
      ...session,
      startedAt: session.startedAt.toISOString(),
    }), {
      PX: this.sessionTTLMs,
    });
  }

  async clearSession(userId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(this.getSessionKey(userId));
  }

  // ─── LLM Extraction ───────────────────────────────────────────────────────
  async extractData(message: string, currentStep?: string): Promise<WorkflowExtractionResult> {
    const stepContext = currentStep
      ? `Current workflow step is: ${currentStep}`
      : "Current workflow step is not set yet (starting workflow).";

    const result = await OllamaChatService.getInstance().generateChat<ChatResponse>({
      systemPrompt: `You are a workflow data extractor.
${stepContext}

Return ONLY valid JSON with this exact shape:
{
  "wants_to_exit": boolean,
  "next_step": string | null,
  "data": object
}

Data object schema:
${this.extractionSchema}

Rules:
- Use wants_to_exit=true only if the user clearly wants to cancel/stop/exit.
- Use next_step to indicate the step to run now when it is clear, otherwise null.
- Put only extracted fields in data.
- Use null for missing values.
- Do not infer values not explicitly provided by user.`,
      chat: [],
      options: { temperature: 0.0 },
      stream: false,
      prompt: message,
    });

    return normalizeExtraction(parseJsonObject(result.message.content ?? ""));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private mergeData(
    existing: Record<string, any>,
    incoming: Record<string, any>,
  ): Record<string, any> {
    const merged = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
      if (value !== null && value !== undefined) {
        merged[key] = value;
      }
    }
    return merged;
  }

  // ─── Entry Points ─────────────────────────────────────────────────────────
  async start(userId: string, message: string): Promise<string> {
    const extraction = await this.extractData(message);

    if (extraction.wants_to_exit) {
      return this.cancelMessage;
    }

    const firstStep =
      extraction.next_step && this.steps[extraction.next_step]
        ? extraction.next_step
        : this.buildInitialStep(extraction.data);

    const session: WorkflowSession = {
      userId,
      activeWorkflow: this.name,
      currentStep: firstStep,
      data: extraction.data,
      startedAt: new Date(),
    };

    await this.setSession(session);

    return this.runStep(session, extraction.data);
  }

  async continue(userId: string, message: string): Promise<string> {
    const session = await this.getSession(userId);
    if (!session) {
      return this.start(userId, message);
    }

    const extraction = await this.extractData(message, session.currentStep);

    if (extraction.wants_to_exit) {
      await this.clearSession(userId);
      return this.cancelMessage;
    }

    const mergedData = this.mergeData(session.data, extraction.data);
    const requestedStep = extraction.next_step;
    const currentStep =
      requestedStep && this.steps[requestedStep]
        ? requestedStep
        : session.currentStep;

    const updatedSession: WorkflowSession = {
      ...session,
      currentStep,
      data: mergedData,
    };

    await this.setSession(updatedSession);

    return this.runStep(updatedSession, extraction.data);
  }

  private async runStep(
    session: WorkflowSession,
    newData: Record<string, any>,
  ): Promise<string> {
    const handler = this.steps[session.currentStep];

    if (!handler) {
      await this.clearSession(session.userId);
      return "Ocurrió un error interno. Por favor intenta de nuevo.";
    }

    const result: WorkflowStepResult = await handler(session.data, newData);

    if (result.nextStep === null) {
      await this.clearSession(session.userId);
    } else {
      await this.setSession({ ...session, currentStep: result.nextStep });
    }

    return result.reply;
  }
}
