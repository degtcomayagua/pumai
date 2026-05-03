import { IMetadata } from "@shared/models/metadata.js";
import { ILog } from "@shared/models/log.js";

type LogLevel = "info" | "warning" | "important" | "error" | "critical";

interface LogQueryFilters {
  level?: LogLevel;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  traceId?: string;
  page?: number;
  limit?: number;
}

interface LogQueryResult {
  logs: ILog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class LoggingService {
  private static readonly REFERENCE_MODEL_BY_DETAIL_KEY: Record<
    string,
    string
  > = {
      accountId: "Account",
      createdByAccountId: "Account",
      updatedByAccountId: "Account",
      deletedByAccountId: "Account",
      restoredByAccountId: "Account",
      roleId: "AccountRole",
      accountRoleId: "AccountRole",
      patientId: "Patient",
      recordId: "Record",
      surgeryId: "Surgery",
      terminalId: "Terminal",
      createdByTerminalId: "Terminal",
      updatedByTerminalId: "Terminal",
      deletedByTerminalId: "Terminal",
      restoredByTerminalId: "Terminal",
      activationKeyId: "ActivationKey",
      configId: "Config",
      logId: "Log",
      fileId: "File",
      sessionId: "Session",
    };

  private static hasReferenceableValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return true;
  }

  private static normalizeReferenceId(value: unknown): string | undefined {
    if (!LoggingService.hasReferenceableValue(value)) {
      return undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    if (typeof value === "object" && value !== null) {
      if ("toString" in value && typeof value.toString === "function") {
        const asString = value.toString();
        return asString && asString !== "[object Object]"
          ? asString
          : undefined;
      }
    }

    return undefined;
  }

  private static buildEnrichedDetails(log: {
    message: string;
    details?: Record<string, any>;
    level: LogLevel;
    source: string;
    duration?: number;
    metadata?: IMetadata;
    traceId?: string;
  }): Record<string, any> {
    const details: Record<string, any> = {
      ...(log.details ?? {}),
      _trace: {
        source: log.source,
        level: log.level,
        message: log.message,
        traceId: log.traceId,
        durationMs: log.duration,
      },
    };

    const createdByAccountId = LoggingService.normalizeReferenceId(
      log.metadata?.createdBy,
    );
    const updatedByAccountId = LoggingService.normalizeReferenceId(
      log.metadata?.updatedBy,
    );
    const deletedByAccountId = LoggingService.normalizeReferenceId(
      log.metadata?.deletedBy,
    );

    if (createdByAccountId && !details.createdByAccountId) {
      details.createdByAccountId = createdByAccountId;
    }
    if (updatedByAccountId && !details.updatedByAccountId) {
      details.updatedByAccountId = updatedByAccountId;
    }
    if (deletedByAccountId && !details.deletedByAccountId) {
      details.deletedByAccountId = deletedByAccountId;
    }

    return details;
  }

  private static buildResolvedReferences(
    details?: Record<string, any>,
    explicitReferences?: Record<string, string | undefined>,
  ): Record<string, string> | undefined {
    const detailsObject = details ?? {};
    const detailEntries = Object.entries(detailsObject).filter(([, value]) =>
      LoggingService.hasReferenceableValue(value),
    );

    if (detailEntries.length === 0) {
      return undefined;
    }

    const detailKeys = new Set(detailEntries.map(([key]) => key));

    const resolvedReferences: Record<string, string> = {};

    for (const [key] of detailEntries) {
      const inferredModel = LoggingService.REFERENCE_MODEL_BY_DETAIL_KEY[key];
      if (inferredModel) {
        resolvedReferences[key] = inferredModel;
      }
    }

    if (explicitReferences) {
      for (const [key, modelName] of Object.entries(explicitReferences)) {
        if (!detailKeys.has(key)) {
          continue;
        }

        if (!modelName || modelName.trim().length === 0) {
          continue;
        }

        resolvedReferences[key] = modelName;
      }
    }

    return Object.keys(resolvedReferences).length > 0
      ? resolvedReferences
      : undefined;
  }

  async log(log: {
    message: string;
    details?: Record<string, any>;
    _references?: Record<string, string | undefined>; // If there's an object that needs to be referenced
    level: LogLevel;
    source: string;
    duration?: number; // Optional duration in milliseconds
    traceId?: string; // Optional trace ID for correlation
  }): Promise<boolean> {
    try {
      const enrichedDetails = LoggingService.buildEnrichedDetails(log);

      console.log(`[${log.level.toUpperCase()}] ${log.source}: ${log.message}`, enrichedDetails);

      const resolvedReferences = LoggingService.buildResolvedReferences(
        enrichedDetails,
        {
          ...(log._references ?? {}),
        },
      );

      // Creae the log entry in the database

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

    return [];
  }

  /**
   * Query persisted log entries with filtering, date range, and pagination.
   */
  async query(filters: LogQueryFilters): Promise<LogQueryResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filters.level) {
      query.level = filters.level;
    }

    if (filters.source) {
      query.source = { $regex: filters.source, $options: "i" };
    }

    if (filters.traceId) {
      query.traceId = filters.traceId;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.date.$lte = filters.endDate;
      }
    }

    // const [logs, total] = await Promise.all([
    //   LogsModel.find(query)
    //     .skip(skip)
    //     .limit(limit)
    //     .sort({ date: -1 })
    //     .lean()
    //     .exec(),
    //   LogsModel.countDocuments(query).exec(),
    // ]);

    return {
      logs: [],
      total: 0,
      page,
      limit,
      totalPages: Math.ceil(100 / limit),
    };
  }
}

export default new LoggingService();
