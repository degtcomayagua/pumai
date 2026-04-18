import { Request, Response, NextFunction } from "express";
import LoggingService from "../../services/logging";

const handler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { level, source, startDate, endDate, traceId, page, limit } =
      req.body;

    const result = await LoggingService.query({
      level,
      source,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      traceId,
      page,
      limit,
    });

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:logs:query",
        level: "error",
        message: "Error querying logs",
        traceId: req.traceId,
        details: {
          error: error.message,
          stack: error.stack,
        },
      });
    }

    res.status(500).json({ status: "internal-error" });
  }
};

export default handler;
