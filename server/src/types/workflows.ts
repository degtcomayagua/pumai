export type WorkflowStepResult = {
  reply: string;
  nextStep: string | null; // null = workflow ends
};

export type StepHandler = (
  data: Record<string, any>,
  newData: Record<string, any>,
) => Promise<WorkflowStepResult>;

export type WorkflowSession = {
  userId: string;
  activeWorkflow: string;
  currentStep: string;
  data: Record<string, any>;
  startedAt: Date;
};