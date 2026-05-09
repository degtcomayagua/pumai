import { Request, Response, NextFunction } from "express";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import {
  getWorkflow,
  executeWorkflowStep,
} from "../../services/workflows/registry.js";
import {
  createWorkflowSession,
  clearWorkflowSession,
} from "../../services/workflows/sessions.js";

const handler = async (
  req: Request<{}, {}, { workflow: string; userInput?: string }>,
  res: Response<WorkflowsAPITypes.StartResponseData>,
  _next: NextFunction,
) => {
  try {
    const { workflow, userInput } = req.body;

    const wf = getWorkflow(workflow);
    if (!wf) {
      res.status(404).json({ status: "not-found" });
      return;
    }

    const session = await createWorkflowSession({
      accountId: req.user!.id.toString(),
      workflow,
      currentStep: wf.firstStep,
      data: { lastUserInput: userInput ?? "" },
    });

    const execution = await executeWorkflowStep(
      workflow,
      wf.firstStep,
      userInput ?? "",
    );

    if (execution.nextStep === null) {
      // Completed immediately
      await clearWorkflowSession(session.sessionId);
    }

    res.status(200).json({
      status: "success",
      workflowSessionId: session.sessionId,
      replies: execution.replies,
      nextStep: execution.nextStep,
    });
  } catch (error) {
    console.error("Error starting workflow:", error);
    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
