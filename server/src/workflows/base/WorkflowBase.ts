// workflows/base/WorkflowBase.ts
import ollama from "ollama";
import { ChatResponse } from "ollama";
import OllamaChatService from "../../services/ollama/chat"
import { getRedisClient } from "../../config/redis";


import { WorkflowSession, WorkflowStepResult, StepHandler } from "../../types/workflows";

export abstract class WorkflowBase {
  /** Unique identifier — must match intent classifier output */
  abstract readonly name: string;

  /**
   * JSON schema description passed to the LLM extractor.
   * Describe every field the workflow might need, all nullable.
   * Example: 'Extract: { "email": string | null, "studentId": string | null }'
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
   * Given fully extracted data from the first message,
   * return the name of the first step to run.
   * Use this to skip steps the user already answered.
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
  async extractData(message: string): Promise<Record<string, any>> {
    const result = await OllamaChatService.getInstance().generateChat<ChatResponse>({
      systemPrompt: `You are a data extractor. Extract structured data from the user message.
${this.extractionSchema}
Rules:
- Return ONLY valid JSON.
- Use null for any field not found or not mentioned.
- Do not infer or guess values the user did not provide.`,
      chat: [],
      options: { temperature: 0.0 },
      stream: false,
      prompt: message,
    });

    try {
      return JSON.parse(result.message.content);
    } catch {
      return {};
    }
  }

  // ─── Escape Detection ─────────────────────────────────────────────────────
  async isEscape(message: string): Promise<boolean> {
    const result = await OllamaChatService.getInstance().generateChat<ChatResponse>({
      systemPrompt: `Does the user want to cancel, exit, or stop the current process?
Reply ONLY as JSON: { "escape": true | false }`,
      chat: [],
      options: { temperature: 0.0 },
      stream: false,
      prompt: message,
    });

    try {
      return JSON.parse(result.message.content)?.escape === true;
    } catch {
      return false;
    }
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
  /**
   * Call this when the intent classifier routes to this workflow.
   * Extracts any data already in the first message and jumps
   * to the correct first step immediately.
   */
  async start(userId: string, message: string): Promise<string> {
    const extracted = await this.extractData(message);
    const firstStep = this.buildInitialStep(extracted);

    const session: WorkflowSession = {
      userId,
      activeWorkflow: this.name,
      currentStep: firstStep,
      data: extracted,
      startedAt: new Date(),
    };

    await this.setSession(session);

    // Run the first step immediately with already-extracted data
    return this.runStep(session, {});
  }

  /**
   * Call this for every subsequent message while this workflow is active.
   */
  async continue(userId: string, message: string): Promise<string> {
    const escape = await this.isEscape(message);
    if (escape) {
      await this.clearSession(userId);
      return this.cancelMessage;
    }

    const session = await this.getSession(userId);
    if (!session) {
      // Session expired — treat as a fresh start
      return this.start(userId, message);
    }

    const newData = await this.extractData(message);
    const mergedData = this.mergeData(session.data, newData);

    await this.setSession({ ...session, data: mergedData });

    return this.runStep({ ...session, data: mergedData }, newData);
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
      // Workflow complete
      await this.clearSession(session.userId);
    } else {
      await this.setSession({ ...session, currentStep: result.nextStep });
    }

    return result.reply;
  }
}