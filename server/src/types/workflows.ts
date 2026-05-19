import type { WorkflowRemoteStep } from "../services/workflows/registry.js";

export type WorkflowName = string;

export type WorkflowStepResult = {
  reply?: {
    title: string;
    content: string;
    imageUrl?: string;
  }
  nextStep: string | null; // null = workflow ends
};

export type StepHandler = (
  data: Record<string, any>,
  newData: Record<string, any>,
) => Promise<WorkflowStepResult>;

export type WorkflowSession = {
  sessionId: string;
  accountId: string;
  activeWorkflow: WorkflowName;
  currentStep: string;
  data: Record<string, unknown>;
  steps: WorkflowRemoteStep[];
  startedAt: Date;
  updatedAt: Date;
};