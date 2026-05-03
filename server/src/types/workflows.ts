import { workflows } from "../services/workflows/repository.js";
export type WorkflowName = keyof typeof workflows;

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
  userId: string;
  activeWorkflow: WorkflowName;
  currentStep: string;
  data: Record<string, any>;
  startedAt: Date;
};