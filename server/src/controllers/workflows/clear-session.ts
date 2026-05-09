import { Request, Response, NextFunction } from "express";

import { clearWorkflowSession } from "../../services/workflows/sessions.js";

const handler = async (
  req: Request<{}, {}, { sessionId: string }>,
  res: Response,
  _next: NextFunction,
) => {
  const { sessionId } = req.body;

  try {
    await clearWorkflowSession(sessionId);
    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error clearing workflow session:", error);
    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
