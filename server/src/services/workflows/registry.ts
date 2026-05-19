import axios from "axios";

import prismaClient from "../../config/prisma.js";
import LoggingService from "../logging.js";

type WorkflowOptionValue = boolean | string | number;

type WorkflowMessageType = "system" | "image" | "text" | "url";

type WorkflowRemoteMessage = {
  type: WorkflowMessageType;
  content: string;
};

type WorkflowRemoteInput = {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
};

export type WorkflowRemoteStep = {
  name: string;
  messages: WorkflowRemoteMessage[];
  options: Record<string, WorkflowOptionValue>;
  inputs: WorkflowRemoteInput[];
  nextStep: string | null;
};

export type WorkflowRemoteInfo = {
  name: string;
  steps: WorkflowRemoteStep[];
};

export type WorkflowStepReply = {
  title: string;
  content: string;
  imageUrl?: string;
};

export type WorkflowStepExecutionResult = {
  step: string;
  nextStep: string | null;
  reply: WorkflowStepReply | null;
  data: Record<string, unknown>;
};

export type RegisteredWorkflow = {
  id: string;
  name: string;
  description: string;
  url: string;
  info: WorkflowRemoteInfo | null;
  loadedAt: Date;
  error: string | null;
};

type WorkflowIntentCandidate = Pick<
  RegisteredWorkflow,
  "id" | "name" | "description" | "url"
>;

const ALLOWED_MESSAGE_TYPES = new Set<WorkflowMessageType>([
  "system",
  "image",
  "text",
  "url",
]);

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function normalizeWorkflowMessage(value: unknown): WorkflowRemoteMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const maybeType = normalizeText(candidate.type, "text") as WorkflowMessageType;
  const messageType = ALLOWED_MESSAGE_TYPES.has(maybeType) ? maybeType : "text";
  const content = normalizeText(candidate.content);

  if (!content) {
    return null;
  }

  return {
    type: messageType,
    content,
  };
}

function normalizeMessages(value: unknown): WorkflowRemoteMessage[] {
  if (Array.isArray(value)) {
    return value
      .map((message) => normalizeWorkflowMessage(message))
      .filter((message): message is WorkflowRemoteMessage => message !== null);
  }

  const single = normalizeWorkflowMessage(value);
  return single ? [single] : [];
}

function normalizeOptions(value: unknown): Record<string, WorkflowOptionValue> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized: Record<string, WorkflowOptionValue> = {};

  for (const [key, optionValue] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof optionValue === "boolean" ||
      typeof optionValue === "string" ||
      typeof optionValue === "number"
    ) {
      normalized[key] = optionValue;
    }
  }

  return normalized;
}

function normalizeInputs(value: unknown): WorkflowRemoteInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((input) => {
      if (!input || typeof input !== "object") {
        return null;
      }

      const candidate = input as Record<string, unknown>;
      const name = normalizeText(candidate.name);

      if (!name) {
        return null;
      }

      const normalized: WorkflowRemoteInput = {
        name,
      };

      if (typeof candidate.type === "string") {
        normalized.type = candidate.type;
      }

      if (typeof candidate.required === "boolean") {
        normalized.required = candidate.required;
      }

      if (typeof candidate.description === "string") {
        normalized.description = candidate.description;
      }

      return normalized;
    })
    .filter((input): input is WorkflowRemoteInput => input !== null);
}

function normalizeStep(value: unknown, index: number): WorkflowRemoteStep {
  const candidate =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const messagesFromMessagesField = normalizeMessages(candidate.messages);
  const fallbackMessage = normalizeText(candidate.message);
  const messages = messagesFromMessagesField.length
    ? messagesFromMessagesField
    : fallbackMessage
      ? ([{ type: "text", content: fallbackMessage }] as WorkflowRemoteMessage[])
      : [];

  return {
    name: normalizeText(candidate.name, `step-${index + 1}`),
    messages,
    options: normalizeOptions(candidate.options),
    inputs: normalizeInputs(candidate.inputs),
    nextStep:
      typeof candidate.nextStep === "string" && candidate.nextStep.trim().length > 0
        ? candidate.nextStep.trim()
        : null,
  };
}

function normalizeRemoteInfo(value: unknown, fallbackName: string): WorkflowRemoteInfo {
  const candidate =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const rawSteps = Array.isArray(candidate.steps) ? candidate.steps : [];

  return {
    name: normalizeText(candidate.name, fallbackName),
    steps: rawSteps.map((step, index) => normalizeStep(step, index)),
  };
}

function normalizeIntentName(value: string): string {
  return value.trim().toLowerCase();
}

class WorkflowsRegistry {
  private static instance: WorkflowsRegistry | null = null;
  private workflows: RegisteredWorkflow[] = [];
  private workflowsById = new Map<string, RegisteredWorkflow>();
  private workflowsByName = new Map<string, RegisteredWorkflow>();
  private loadingPromise: Promise<void> | null = null;
  private initialized = false;

  private constructor() { }

  static getInstance(): WorkflowsRegistry {
    if (!WorkflowsRegistry.instance) {
      WorkflowsRegistry.instance = new WorkflowsRegistry();
    }

    return WorkflowsRegistry.instance;
  }

  async initialize(forceReload = false): Promise<void> {
    if (this.loadingPromise && !forceReload) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = this.load(forceReload).finally(() => {
      this.loadingPromise = null;
    });

    await this.loadingPromise;
  }

  isReady(): boolean {
    return this.initialized;
  }

  getAll(): RegisteredWorkflow[] {
    return [...this.workflows];
  }

  getById(workflowId: string): RegisteredWorkflow | null {
    return this.workflowsById.get(workflowId) ?? null;
  }

  getByName(workflowName: string): RegisteredWorkflow | null {
    return this.workflowsByName.get(normalizeIntentName(workflowName)) ?? null;
  }

  getIntentCandidates(): WorkflowIntentCandidate[] {
    return this.workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      url: workflow.url,
    }));
  }

  resolveIntent(intent: string): RegisteredWorkflow | null {
    return this.getByName(intent);
  }

  async getWorkflowInfo(workflowName: string): Promise<WorkflowRemoteInfo | null> {
    const workflow = this.getByName(workflowName);

    if (!workflow?.url) {
      return null;
    }

    try {
      const response = await axios.post<WorkflowRemoteInfo>(
        workflow.url,
        { intent: "get-info" },
        { timeout: 10000 },
      );

      const normalized = normalizeRemoteInfo(response.data, workflow.name);

      this.mergeWorkflowCache(workflow.id, normalized, null);

      return normalized;
    } catch (error: unknown) {
      const reason =
        axios.isAxiosError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";

      this.mergeWorkflowCache(workflow.id, workflow.info, reason);

      return workflow.info;
    }
  }

  async executeStep(
    workflowName: string,
    step: string,
    data: Record<string, unknown> = {},
  ): Promise<WorkflowStepExecutionResult | null> {
    const workflow = this.getByName(workflowName);

    if (!workflow?.url) {
      return null;
    }

    try {
      const response = await axios.post<Partial<WorkflowStepExecutionResult>>(
        workflow.url,
        {
          intent: "execute-step",
          step,
          data,
        },
        { timeout: 10000 },
      );

      const payload = response.data ?? {};

      return {
        step: normalizeText(payload.step, step),
        nextStep:
          typeof payload.nextStep === "string" && payload.nextStep.trim().length > 0
            ? payload.nextStep.trim()
            : null,
        reply:
          payload.reply && typeof payload.reply === "object"
            ? {
              title: normalizeText(payload.reply.title, workflow.name),
              content: normalizeText(payload.reply.content),
              imageUrl:
                typeof payload.reply.imageUrl === "string" &&
                  payload.reply.imageUrl.trim().length > 0
                  ? payload.reply.imageUrl.trim()
                  : undefined,
            }
            : null,
        data:
          payload.data && typeof payload.data === "object"
            ? (payload.data as Record<string, unknown>)
            : data,
      };
    } catch (error: unknown) {
      const reason =
        axios.isAxiosError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";

      this.mergeWorkflowCache(workflow.id, workflow.info, reason);

      return null;
    }
  }

  private async load(forceReload: boolean): Promise<void> {
    if (this.initialized && !forceReload) {
      return;
    }

    const databaseWorkflows = await prismaClient.workflow.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const loadedAt = new Date();

    const loadedWorkflows = await Promise.all(
      databaseWorkflows.map(async (workflow) => {
        try {
          const response = await axios.post<WorkflowRemoteInfo>(
            workflow.url,
            { intent: "get-info" },
            { timeout: 10000 },
          );
          return {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            url: workflow.url,
            info: normalizeRemoteInfo(response.data, workflow.name),
            loadedAt,
            error: null,
          } satisfies RegisteredWorkflow;
        } catch (error: unknown) {
          const reason =
            axios.isAxiosError(error)
              ? error.message
              : error instanceof Error
                ? error.message
                : "Unknown error";

          return {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            url: workflow.url,
            info: null,
            loadedAt,
            error: reason,
          } satisfies RegisteredWorkflow;
        }
      }),
    );

    this.workflows = loadedWorkflows;
    this.workflowsById = new Map(
      loadedWorkflows.map((workflow) => [workflow.id, workflow]),
    );
    this.workflowsByName = new Map(
      loadedWorkflows.map((workflow) => [
        normalizeIntentName(workflow.name),
        workflow,
      ]),
    );
    this.initialized = true;

    const failed = loadedWorkflows.filter((workflow) => workflow.error !== null);

    await LoggingService.log({
      source: "services:workflows:registry",
      level: failed.length > 0 ? "warning" : "info",
      message: "Workflow registry initialized",
      details: {
        totalWorkflows: loadedWorkflows.length,
        failedWorkflows: failed.length,
      },
    });
  }

  private mergeWorkflowCache(
    workflowId: string,
    info: WorkflowRemoteInfo | null,
    error: string | null,
  ): void {
    const existing = this.workflowsById.get(workflowId);

    if (!existing) {
      return;
    }

    const updated: RegisteredWorkflow = {
      ...existing,
      info,
      error,
      loadedAt: new Date(),
    };

    this.workflowsById.set(workflowId, updated);
    this.workflowsByName.set(normalizeIntentName(updated.name), updated);
    this.workflows = this.workflows.map((workflow) =>
      workflow.id === workflowId ? updated : workflow,
    );
  }
}

export default WorkflowsRegistry;