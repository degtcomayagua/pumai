import api from "./api";

import LogsTable from "./components/LogsViewer";
import LogDetails from "./components/LogDetails";

import { useList } from "./hooks/useList"

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
  _references?: Record<string, string>;
}

export type { LogsAPITypes, ILog, ListLog }
export default {
  api,
  hooks: {
    useList
  },
  components: {
    LogsTable,
    LogDetails,
  },
};
