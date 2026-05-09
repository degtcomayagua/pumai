import { Request, Response, NextFunction } from "express";

import {
  initializeWorkflowRegistry,
  getWorkflowList,
} from "../../services/workflows/registry.js";

const handler = async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    // Ensure the registry is initialized (no-op if already loaded)
    await initializeWorkflowRegistry();

    const list = getWorkflowList();

    res.status(200).json({ status: "success", workflows: list });
  } catch (error) {
    console.error("Error fetching available workflows:", error);
    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
