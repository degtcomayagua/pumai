import { ChatResponse } from "ollama";

import OllamaChatService from "../../services/ollama/chat";

import { WorkflowSession, WorkflowStepResult, StepHandler } from "../../types/workflows";

import { clearWorkflowSession, updateWorkflowSession } from "../../services/workflows/sessions";

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

  // Workflow description shown to the AI when deciding which workflow to use, and to users when listing workflows.
  abstract readonly description: string;

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
  async start(session: WorkflowSession, prompt: string): Promise<WorkflowStepResult["reply"]> {
    const extraction = await this.extractData(prompt);

    if (extraction.wants_to_exit) {
      return {
        title: "Proceso cancelado",
        content: this.cancelMessage,
      };
    }


    const firstStep =
      extraction.next_step && this.steps[extraction.next_step]
        ? extraction.next_step
        : this.buildInitialStep(extraction.data);


    await updateWorkflowSession(session.sessionId, {
      currentStep: firstStep,
      data: extraction.data,
    });

    const initializedSession: WorkflowSession = {
      ...session,
      currentStep: firstStep,
      data: extraction.data,
    };

    return this.runStep(initializedSession, extraction.data);
  }

  async continue(session: WorkflowSession, message: string): Promise<WorkflowStepResult["reply"]> {
    const extraction = await this.extractData(message, session.currentStep);

    if (extraction.wants_to_exit) {
      await clearWorkflowSession(session.sessionId);
      return {
        title: "Proceso cancelado",
        content: this.cancelMessage,
      };
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

    await updateWorkflowSession(session.sessionId, {
      currentStep,
      data: mergedData,
    })

    return this.runStep(updatedSession, extraction.data);
  }

  private async runStep(
    session: WorkflowSession,
    newData: Record<string, any>,
  ): Promise<WorkflowStepResult["reply"]> {
    const handler = this.steps[session.currentStep];

    if (!handler) {
      await clearWorkflowSession(session.sessionId);
      return { title: "Error", content: "Ocurrió un error interno. Por favor intenta de nuevo." };
    }

    const result: WorkflowStepResult = await handler(session.data, newData);

    if (result.nextStep === null) {
      await clearWorkflowSession(session.sessionId);
    } else {
      await updateWorkflowSession(session.sessionId, {
        currentStep: result.nextStep,
        data: session.data,
      });
    }

    if (result.reply) {
      return result.reply;
    }

    return {
      title: "Error",
      content: "El flujo no devolvio una respuesta valida. Intenta de nuevo.",
    };
  }
}
