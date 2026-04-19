import { Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import type { ListLog } from "..";
import type { FetchLogsFn } from "../hooks/useList";

const { Text } = Typography;

const levelColors: Record<string, string> = {
  info: "blue",
  warning: "orange",
  important: "purple",
  error: "red",
  critical: "volcano",
  debug: "default",
};

type LogsTableProps = {
  logs: {
    logs: ListLog[];
    totalLogs: number;
  };
  logsListState: {
    count: number;
    page: number;
    loading: boolean;
  };
  fetchLogs: FetchLogsFn;
  onSelectLog: (log: ListLog) => void;
};

export default function LogsTable({
  logs,
  logsListState,
  fetchLogs,
  onSelectLog,
}: LogsTableProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "logs.components.table",
  });

  const columns: ColumnsType<ListLog> = [
    {
      title: t("columns.date"),
      dataIndex: "date",
      key: "date",
      width: 180,
      render: (val: string) =>
        val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : t("emptyValue"),
    },
    {
      title: t("columns.level"),
      dataIndex: "level",
      key: "level",
      width: 100,
      render: (val: string) => (
        <Tag color={levelColors[val] || "default"}>
          {t(`levels.${val}`, { defaultValue: val?.toUpperCase() })}
        </Tag>
      ),
    },
    {
      title: t("columns.source"),
      dataIndex: "source",
      key: "source",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("columns.message"),
      dataIndex: "message",
      key: "message",
      ellipsis: true,
    },
    {
      title: t("columns.traceId"),
      dataIndex: "traceId",
      key: "traceId",
      width: 140,
      ellipsis: true,
      render: (val: string) => (
        <Text copyable={val ? { text: val } : undefined} className="text-xs">
          {val
            ? t("traceIdShort", { value: val.substring(0, 8) })
            : t("emptyValue")}
        </Text>
      ),
    },
    {
      title: t("columns.duration"),
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (val: number) =>
        val !== undefined && val !== null
          ? t("durationMs", { value: val })
          : t("emptyValue"),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={logs.logs}
      rowKey="_id"
      loading={logsListState.loading}
      pagination={{
        pageSize: logsListState.count,
        total: logs.totalLogs,
        current: logsListState.page + 1,
        showTotal: (total, range) =>
          t("total", {
            total,
            range: `${range[0]}-${range[1]}`,
          }),
        showSizeChanger: true,
        onChange: (current, size) => {
          fetchLogs({
            count: size,
            page: current - 1,
          });
        },
      }}
      size="small"
      onRow={(record) => ({
        onClick: () => {
          onSelectLog(record);
        },
        style: { cursor: "pointer" },
      })}
    />
  );
}
