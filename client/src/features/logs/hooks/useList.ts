import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { App } from "antd";

import api from "../api";
import { ILog, ListLog, LogsAPITypes } from "../";

export type NullableLogsListState = {
  [K in keyof LogsAPITypes.ListRequestBody]?:
  | LogsAPITypes.ListRequestBody[K]
  | null;
};
export type FetchLogsFn = (
  params?: NullableLogsListState,
) => Promise<void>;

type UseLogsListOptions = {
  apiList?: typeof api.list;
};

export function useList({ apiList = api.list }: UseLogsListOptions = {}) {
  const { message } = App.useApp();

  const { t } = useTranslation(["features"], {
    keyPrefix: "logs.hooks.useList",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [logsListState, setLogsListState] = useState<
    LogsAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: ["_id", "metadata", "date", "details", "details", "message", "traceId", "level"],
    populate: [],
    count: 50,
    page: 0,
  });

  const [logs, setLogs] = useState<{
    totalLogs: number;
    logs: ListLog[];
  }>({
    logs: [],
    totalLogs: 0,
  });

  const fetchLogs = useCallback(
    async ({
      count = logsListState.count,
      page = logsListState.page,
      includeDeleted = logsListState.includeDeleted,
      search = logsListState.search,
    }: NullableLogsListState = {}) => {
      setLogsListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...logsListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success" && result.logs) {
        setLogsListState((prev) => ({
          ...prev,
          count: count as number,
          page: page as number,
          search: search == null ? undefined : search,
          includeDeleted: includeDeleted == null ? undefined : includeDeleted,
          loading: false,
        }));

        setLogs({
          logs: result.logs.map((log) => ({
            _id: log._id.toString(),
            date: log.date,
            source: log.source,
            level: log.level,
            message: log.message,
            duration: log.duration,
            details: log.details,
            traceId: log.traceId,
          })),
          totalLogs: result.totalLogs ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setLogsListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [logsListState, message, t, tErrorMessages, apiList],
  );

  return {
    logsListState,
    logs,
    fetchLogs,
  };
}

