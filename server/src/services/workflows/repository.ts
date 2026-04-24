// Import workflows
import { SumThreeNumbersWorkflow } from "../../workflows/sum-three-numbers"

export const workflows = {
  "sum_three_numbers": SumThreeNumbersWorkflow,
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