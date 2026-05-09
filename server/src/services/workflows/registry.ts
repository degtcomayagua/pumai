import prismaClient from "../../config/prisma.js";

import {
  Workflow,
  WorkflowAuthType,
  WorkflowProtocol,
} from "../../../../generated/prisma/client.js";

export type WorkflowRegistryInfo = {
  name: string;
  description: string;
  firstStep: string;
  steps: string[];
};

export type WorkflowReply = {
  type: "text" | "url" | "image";
  content: string;
};

export type WorkflowExecutionResult = {
  replies: WorkflowReply[];
  nextStep: string | null;
};

export type RegisteredWorkflow = Workflow & WorkflowRegistryInfo;

type WorkflowRequestBody = {
  intent: "get-info" | "execute-step";
  currentStep?: string;
  userInput?: string;
};

let registeredWorkflows: Record<string, RegisteredWorkflow> = {};
let registryInitPromise: Promise<void> | null = null;
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

function parseJsonObject(raw: string): Record<string, any> | null {
  const content = raw.trim();

  if (!content) {
    return null;
  }

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() || content;

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    // Continue with best-effort extraction.
  }

  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      const parsed = JSON.parse(candidate.slice(first, last + 1));
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, any>)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeSteps(steps: unknown): string[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .filter((step): step is string => typeof step === "string")
    .map((step) => step.trim())
    .filter(Boolean);
}

function buildRequestHeaders(workflow: Workflow): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (workflow.authType === WorkflowAuthType.bearer && workflow.authToken) {
    headers.Authorization = `Bearer ${workflow.authToken}`;
  }

  if (workflow.authType === WorkflowAuthType.api_key && workflow.authKey) {
    headers[workflow.authHeaderName?.trim() || "x-api-key"] = workflow.authKey;
  }

  if (
    workflow.authType === WorkflowAuthType.basic &&
    workflow.authUsername &&
    workflow.authPassword
  ) {
    const token = Buffer.from(
      `${workflow.authUsername}:${workflow.authPassword}`,
    ).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  return headers;
}

async function requestWorkflowPayload(
  workflow: Workflow,
  body: WorkflowRequestBody,
): Promise<Record<string, any>> {
  if (workflow.protocol !== WorkflowProtocol.webhook) {
    throw new Error(`Unsupported workflow protocol: ${workflow.protocol}`);
  }

  // Retry a few times for transient network errors or slow endpoints.
  const attempts = 3;
  const timeoutMs = 15_000;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(workflow.url, {
        method: "POST",
        headers: buildRequestHeaders(workflow),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Workflow request failed with status ${response.status}`,
        );
      }

      const text = await response.text();
      const payload = parseJsonObject(text);

      if (!payload) {
        throw new Error("Workflow response was not valid JSON");
      }

      return payload;
    } catch (err) {
      const isLast = attempt === attempts;
      console.warn(
        `[WorkflowRegistry] request attempt ${attempt} for ${workflow.name} failed:`,
        err instanceof Error ? err.message : String(err),
      );

      if (isLast) {
        throw err;
      }

      // Backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Unreachable: failed to request workflow payload");
}

function normalizeRegistryInfo(
  workflow: Workflow,
  payload: Record<string, any>,
): WorkflowRegistryInfo {
  const name =
    typeof payload.name === "string" && payload.name.trim().length > 0
      ? payload.name.trim()
      : workflow.name;

  const description =
    typeof payload.description === "string" &&
    payload.description.trim().length > 0
      ? payload.description.trim()
      : workflow.description;

  const steps = normalizeSteps(payload.steps);
  const firstStepFromPayload =
    typeof payload.firstStep === "string" && payload.firstStep.trim().length > 0
      ? payload.firstStep.trim()
      : null;
  const firstStep =
    firstStepFromPayload && steps.includes(firstStepFromPayload)
      ? firstStepFromPayload
      : steps[0] || firstStepFromPayload || "";

  return {
    name,
    description,
    firstStep,
    steps,
  };
}

function normalizeExecutionResult(
  payload: Record<string, any>,
): WorkflowExecutionResult {
  const replies = Array.isArray(payload.replies)
    ? payload.replies
        .map((reply): WorkflowReply | null => {
          if (!reply || typeof reply !== "object") {
            return null;
          }

          const type = typeof reply.type === "string" ? reply.type.trim() : "";
          const content =
            typeof reply.content === "string" ? reply.content.trim() : "";

          if (!content) {
            return null;
          }

          if (type === "text" || type === "url" || type === "image") {
            return { type, content };
          }

          return { type: "text", content };
        })
        .filter((reply): reply is WorkflowReply => reply !== null)
    : [];

  const nextStep =
    typeof payload.nextStep === "string" && payload.nextStep.trim().length > 0
      ? payload.nextStep.trim()
      : null;

  return {
    replies,
    nextStep,
  };
}

async function registerWorkflow(
  workflow: Workflow,
): Promise<RegisteredWorkflow | null> {
  const payload = await requestWorkflowPayload(workflow, {
    intent: "get-info",
  });

  const info = normalizeRegistryInfo(workflow, payload);

  if (!info.name || !info.firstStep || info.steps.length === 0) {
    throw new Error(
      `Workflow ${workflow.name} did not return a valid registry payload`,
    );
  }

  return {
    ...workflow,
    ...info,
  };
}

async function loadRegistry(): Promise<void> {
  const databaseWorkflows = await prismaClient.workflow.findMany({
    where: {
      isActive: true,
    },
  });

  const nextRegistryEntries = await Promise.all(
    databaseWorkflows.map(async (workflow) => {
      try {
        const registered = await registerWorkflow(workflow);
        return registered;
      } catch (error) {
        console.error("[WorkflowRegistry] Failed to register workflow", {
          workflowId: workflow.id,
          workflowName: workflow.name,
          error: error instanceof Error ? error.message : String(error),
        });

        return null;
      }
    }),
  );

  registeredWorkflows = {};

  for (const registeredWorkflow of nextRegistryEntries) {
    if (!registeredWorkflow) {
      continue;
    }

    registeredWorkflows[registeredWorkflow.name] = registeredWorkflow;
  }

  if (
    databaseWorkflows.length > 0 &&
    Object.keys(registeredWorkflows).length === 0
  ) {
    // If all remote workflow endpoints failed to respond, log a warning
    // but do not throw — the application should remain available even when
    // external workflows are unreachable.
    console.warn(
      "[WorkflowRegistry] No workflows could be registered from Prisma — continuing without registered workflows",
    );
  }

  console.log("[WorkflowRegistry] Loaded workflows", {
    total: Object.keys(registeredWorkflows).length,
  });
}

export async function initializeWorkflowRegistry(): Promise<void> {
  if (registryInitPromise) {
    return registryInitPromise;
  }

  registryInitPromise = (async () => {
    try {
      await loadRegistry();
    } catch (err) {
      console.error(
        "[WorkflowRegistry] initialization failed:",
        err instanceof Error ? err.message : String(err),
      );
      // Do not rethrow — callers should not crash the application when the
      // registry initialization fails. The in-memory registry may be empty.
    } finally {
      registryInitPromise = null;
    }
  })();

  // Schedule periodic auto-refresh of the registry to pick up remote changes
  if (!autoRefreshTimer) {
    autoRefreshTimer = setInterval(async () => {
      try {
        await refreshWorkflowRegistry();
      } catch (err) {
        console.error("[WorkflowRegistry] auto-refresh failed:", err);
      }
    }, AUTO_REFRESH_MS);
  }

  return registryInitPromise;
}

export async function refreshWorkflowRegistry(): Promise<void> {
  registryInitPromise = null;
  await initializeWorkflowRegistry();
}

export function getWorkflows(): Record<string, RegisteredWorkflow> {
  return registeredWorkflows;
}

export function getWorkflowList(): Array<{
  name: string;
  description: string;
}> {
  return Object.values(registeredWorkflows).map((workflow) => ({
    name: workflow.name,
    description: workflow.description,
  }));
}

export function getWorkflow(name: string): RegisteredWorkflow | null {
  return registeredWorkflows[name] ?? null;
}

export async function executeWorkflowStep(
  workflowName: string,
  currentStep: string,
  userInput: string,
): Promise<WorkflowExecutionResult> {
  const workflow = getWorkflow(workflowName);

  if (!workflow) {
    throw new Error(`Workflow ${workflowName} is not registered`);
  }

  const payload = await requestWorkflowPayload(workflow, {
    intent: "execute-step",
    currentStep,
    userInput,
  });

  return normalizeExecutionResult(payload);
}
