import api from "./api";

import * as LogsAPITypes from "../../../../shared/api/logs"
import { ILog } from "../../../../shared/models/log"

import LogsViewer from "./components/LogsViewer";

export type { LogsAPITypes, ILog }
export default {
  api,
  components: {
    LogsViewer,
  },
};
