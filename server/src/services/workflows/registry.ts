import prismaClient from "../../config/prisma.js";

import { Workflow, WorkflowProtocol } from "@prisma/client";

import {
  WorkflowRegistryInfo,
  WorkflowRequestBody,
  WorkflowStepResult,
} from "../../types/workflows.js";

import { buildRequestHeaders } from "server/src/utils/workflows/auth.js";

export type RegisteredWorkflow = Workflow & WorkflowRegistryInfo;

// State
let registeredWorkflows: Record<string, RegisteredWorkflow> = {};
let registryInitPromise: Promise<void> | null = null;

// Time to ping remote workflows to refresh their info in the registry, in milliseconds
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// Helper function to request workflow info or execute a workflow step, with retries and timeout
async function requestWorkflowPayload(
  workflow: Workflow,
  body: WorkflowRequestBody,
): Promise<WorkflowStepResult | WorkflowRegistryInfo> {
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
      const payload = JSON.parse(text);

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

//#region Workflow Steps Execution
export async function executeWorkflowStep(
  workflowName: string,
  currentStep: string,
  userInput: string,
): Promise<WorkflowStepResult> {
  const workflow = getWorkflow(workflowName);

  if (!workflow) {
    throw new Error(`Workflow ${workflowName} is not registered`);
  }

  const stepExecutionResult = (await requestWorkflowPayload(workflow, {
    intent: "execute-step",
    currentStep,
    userInput,
  })) as WorkflowStepResult;

  return stepExecutionResult;
}
//#endregion

//#region Workflow Registry Initialization and Refresh
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
      "[WorkflowRegistry] No workflows could be registered from Prisma, continuing without registered workflows",
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

async function registerWorkflow(
  workflow: Workflow,
): Promise<RegisteredWorkflow | null> {
  const info = (await requestWorkflowPayload(workflow, {
    intent: "get-info",
  })) as WorkflowRegistryInfo;

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

export async function refreshWorkflowRegistry(): Promise<void> {
  registryInitPromise = null;
  await initializeWorkflowRegistry();
}
//#endregion

//#region Registry Accessors
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
//#endregion
