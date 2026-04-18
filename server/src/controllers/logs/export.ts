import { Request, Response, NextFunction } from "express";
import LoggingService from "../../services/logging";

const handler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { level, source, startDate, endDate, traceId } = req.body;

    // Fetch all matching logs (up to 10000 for export)
    const result = await LoggingService.query({
      level,
      source,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      traceId,
      page: 1,
      limit: 10000,
    });

    // Build CSV manually to avoid adding a dependency
    const headers = [
      "timestamp",
      "level",
      "source",
      "message",
      "traceId",
      "duration",
      "details",
    ];

    const escapeCSV = (val: string): string => {
      if (
        val.includes(",") ||
        val.includes('"') ||
        val.includes("\n") ||
        val.includes("\r")
      ) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = result.logs.map((log) =>
      [
        log.date ? new Date(log.date).toISOString() : "",
        log.level || "",
        log.source || "",
        log.message || "",
        log.traceId || "",
        log.duration !== undefined ? String(log.duration) : "",
        log.details ? JSON.stringify(log.details) : "",
      ]
        .map(escapeCSV)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="logs-export-${Date.now()}.csv"`,
    );
    res.send(csv);

    LoggingService.log({
      source: "api:logs:export",
      level: "info",
      message: `Logs exported (${result.logs.length} entries)`,
      traceId: req.traceId,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:logs:export",
        level: "error",
        message: "Error exporting logs",
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
