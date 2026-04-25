// Import workflows
import { ResetPasswordWorkflow } from "../../workflows/email/reset-password"

export const workflows = {
  "reset_password_unah": ResetPasswordWorkflow,
};

export function getWorkflows() {
  return workflows;
}

export function getWorkflowNames(): string[] {
  return Object.keys(workflows);
}

export function getWorkflowList(): {
  name: string;
  description: string;
}[] {
  return Object.values(workflows).map((WorkflowClass) => {
    const instance = new WorkflowClass();
    return {
      name: instance.name,
      description: instance.description,
    };
  });
}