import { WorkflowBase } from "../../workflows/base/WorkflowBase.js";
import ResetPasswordWorkflow from "../../workflows/email/reset-password.js";

export type WorkflowConstructor = new () => WorkflowBase;

export const workflows = {
  reset_password_unah: ResetPasswordWorkflow,
} as const satisfies Record<string, WorkflowConstructor>;

export type WorkflowName = keyof typeof workflows;

export type WorkflowCatalogEntry = {
  name: string;
  description: string;
};

export function getWorkflows() {
  return workflows;
}

export function getWorkflowList(): WorkflowCatalogEntry[] {
  return Object.values(workflows).map((WorkflowClass) => {
    const workflow = new WorkflowClass();

    return {
      name: workflow.name,
      description: workflow.description,
    };
  });
}

export function createWorkflowInstance(name: string): WorkflowBase | null {
  const WorkflowClass = workflows[name as WorkflowName];

  if (!WorkflowClass) {
    return null;
  }

  return new WorkflowClass();
}

export function isWorkflowName(name: string): name is WorkflowName {
  return name in workflows;
}
