import api from "./api";

import LogsViewer from "./components/LogsViewer";

import * as LogsAPITypes from "../../../../shared/api/logs"
import { ILog } from "../../../../shared/models/log"
interface ListLog {
  _id: string;
  date: Date;
  source: string;
  level: "info" | "warning" | "error" | "critical" | "debug" | "important";
  message: string;
  duration?: number; // Optional duration in milliseconds
  details?: Record<string, any>;
  traceId?: string; // Optional request ID for tracing requests
}

export type { LogsAPITypes, ILog, ListLog }
export default {
  api,
  components: {
    LogsViewer,
  },
};
