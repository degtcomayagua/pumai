import { IMetadata } from "../../../shared/models/metadata";
import LogsModel from "../models/Log";
import { ILog } from "../../../shared/models/log";

type LogLevel = "info" | "warning" | "important" | "error" | "critical";

class LoggingService {
  async log(log: {
    message: string;
    details?: Record<string, any>;
    _references?: Record<string, string | undefined>; // If there's an object that needs to be referenced
    level: LogLevel;
    source: string;
    duration?: number; // Optional duration in milliseconds
    metadata?: IMetadata;
    traceId?: string; // Optional trace ID for correlation
  }): Promise<boolean> {
    try {
      const newLog = new LogsModel({
        date: new Date(),
        message: log.message,
        traceId: log.traceId,
        details: log.details,
        level: log.level,
        source: log.source,
        metadata: log.metadata,
      });
      await newLog.save();
      return true;
    } catch (err) {
      // Avoid throwing from logging
      console.error("LoggingService error:", err);
      return false;
    }
  }

  async getLogs(params: {
    count: number;
    offset: number;
    level?: LogLevel;
    source?: string;
  }): Promise<ILog[]> {
    const query: Partial<Pick<ILog, "level" | "source">> = {};

    if (params.level) query.level = params.level;
    if (params.source) query.source = params.source;

    return await LogsModel.find(query)
      .skip(params.offset)
      .limit(params.count)
      .sort({ date: -1 })
      .lean()
      .exec();
  }
}

export default new LoggingService();
