import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import AdminPageLayout from "../../../layouts/Admin";

import { App, Button, DatePicker, Input, Select, Space, Typography } from "antd";
import LogsFeature, {
  type ListLog,
  type LogsAPITypes,
} from "../../../features/logs";

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export const Route = createFileRoute("/admin/logs/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.logs",
  });
  const { t: tFeatureLogsTable } = useTranslation(["features"], {
    keyPrefix: "logs.components.table",
  });

  const { logs, logsListState, fetchLogs } = LogsFeature.hooks.useList({});
  const [selectedLog, setSelectedLog] = useState<ListLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  type LogLevel = NonNullable<LogsAPITypes.ListRequestBody["filters"]>["level"];

  const [levelFilter, setLevelFilter] = useState<LogLevel | undefined>();
  const [sourceFilter, setSourceFilter] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [traceIdFilter, setTraceIdFilter] = useState("");
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);

  useEffect(() => {
    if (!account) return;

    if (
      !account.data.role.permissions.includes("logs:read") &&
      !account.data.role.permissions.includes("*")
    ) {
      message.error(tPage("error-messages:forbidden"));
      navigate({ to: "/admin" });
      return;
    }

    void fetchLogs({ count: 50, page: 0 });
  }, [account]);

  const applyFilters = async () => {
    await fetchLogs({
      count: logsListState.count,
      page: 0,
      search: messageSearch.trim()
        ? {
          query: messageSearch.trim(),
          searchIn: ["message"],
        }
        : null,
      filters: {
        level: levelFilter,
        source: sourceFilter.trim() || undefined,
        traceId: traceIdFilter.trim() || undefined,
        startDate: dateRange?.[0]?.toDate(),
        endDate: dateRange?.[1]?.toDate(),
      },
    });
  };

  const clearFilters = async () => {
    setLevelFilter(undefined);
    setSourceFilter("");
    setMessageSearch("");
    setTraceIdFilter("");
    setDateRange(null);

    await fetchLogs({
      page: 0,
      search: null,
      filters: null,
    });
  };

  return (
    <AdminPageLayout selectedPage="logs">
      <Title level={2}>{tPage("title")}</Title>
      <Paragraph>{tPage("description")}</Paragraph>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          className="min-w-[180px]"
          placeholder={tPage("filters.levelPlaceholder")}
          value={levelFilter}
          onChange={(value) => {
            setLevelFilter(value);
          }}
          options={[
            {
              label: tFeatureLogsTable("levels.info"),
              value: "info",
            },
            {
              label: tFeatureLogsTable("levels.warning"),
              value: "warning",
            },
            {
              label: tFeatureLogsTable("levels.important"),
              value: "important",
            },
            {
              label: tFeatureLogsTable("levels.error"),
              value: "error",
            },
            {
              label: tFeatureLogsTable("levels.critical"),
              value: "critical",
            },
          ]}
        />

        <Input
          allowClear
          className="min-w-[220px]"
          placeholder={tPage("filters.sourcePlaceholder")}
          value={sourceFilter}
          onChange={(event) => {
            setSourceFilter(event.target.value);
          }}
          onPressEnter={applyFilters}
        />

        <Input
          allowClear
          className="min-w-[220px]"
          placeholder={tPage("filters.messagePlaceholder")}
          value={messageSearch}
          onChange={(event) => {
            setMessageSearch(event.target.value);
          }}
          onPressEnter={applyFilters}
        />

        <Input
          allowClear
          className="min-w-[200px]"
          placeholder={tPage("filters.traceIdPlaceholder")}
          value={traceIdFilter}
          onChange={(event) => {
            setTraceIdFilter(event.target.value);
          }}
          onPressEnter={applyFilters}
        />

        <RangePicker
          showTime
          value={dateRange}
          placeholder={[
            tPage("filters.dateRangePlaceholderStart"),
            tPage("filters.dateRangePlaceholderEnd"),
          ]}
          onChange={(value) => {
            setDateRange(
              value as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
            );
          }}
        />

        <Space>
          <Button type="primary" onClick={applyFilters}>
            {tPage("filters.apply")}
          </Button>
          <Button onClick={clearFilters}>{tPage("filters.clear")}</Button>
        </Space>
      </div>

      <LogsFeature.components.LogDetails
        open={detailsOpen}
        log={selectedLog}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedLog(null);
        }}
      />

      <LogsFeature.components.LogsTable
        logs={logs}
        logsListState={logsListState}
        fetchLogs={fetchLogs}
        onSelectLog={(log) => {
          setSelectedLog(log);
          setDetailsOpen(true);
        }}
      />
    </AdminPageLayout>
  );
}
