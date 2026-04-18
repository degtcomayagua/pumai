import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Select,
  Input,
  DatePicker,
  Button,
  Tag,
  Modal,
  Space,
  Card,
  Typography,
} from "antd";
import { FaDownload, FaSearch } from "react-icons/fa";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import logsApi, { LogEntry, LogQueryParams } from "../api";

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const levelColors: Record<string, string> = {
  info: "blue",
  warning: "orange",
  important: "purple",
  error: "red",
  critical: "volcano",
  debug: "default",
};

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string | undefined>();
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: LogQueryParams = {
        page,
        limit,
      };
      if (levelFilter) params.level = levelFilter;
      if (sourceFilter.trim()) params.source = sourceFilter.trim();
      if (dateRange && dateRange[0]) {
        params.startDate = dateRange[0].toISOString();
      }
      if (dateRange && dateRange[1]) {
        params.endDate = dateRange[1].toISOString();
      }

      const result = await logsApi.query(params);
      if (result.status === "success") {
        setLogs(result.logs);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch {
      // handled by API layer
    } finally {
      setLoading(false);
    }
  }, [page, limit, levelFilter, sourceFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = async () => {
    try {
      const params: Omit<LogQueryParams, "page" | "limit"> = {};
      if (levelFilter) params.level = levelFilter;
      if (sourceFilter.trim()) params.source = sourceFilter.trim();
      if (dateRange && dateRange[0]) {
        params.startDate = dateRange[0].toISOString();
      }
      if (dateRange && dateRange[1]) {
        params.endDate = dateRange[1].toISOString();
      }

      const blob = await logsApi.exportCSV(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-export-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // handled
    }
  };

  const columns: ColumnsType<LogEntry> = [
    {
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      width: 180,
      render: (val: string) =>
        val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "Nivel",
      dataIndex: "level",
      key: "level",
      width: 100,
      render: (val: string) => (
        <Tag color={levelColors[val] || "default"}>
          {val?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Origen",
      dataIndex: "source",
      key: "source",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Mensaje",
      dataIndex: "message",
      key: "message",
      ellipsis: true,
    },
    {
      title: "Trace ID",
      dataIndex: "traceId",
      key: "traceId",
      width: 140,
      ellipsis: true,
      render: (val: string) => (
        <Text copyable={val ? { text: val } : undefined} className="text-xs">
          {val ? val.substring(0, 8) + "..." : "-"}
        </Text>
      ),
    },
    {
      title: "Duración",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (val: number) => (val !== undefined && val !== null ? `${val}ms` : "-"),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          allowClear
          placeholder="Nivel"
          style={{ width: 150 }}
          value={levelFilter}
          onChange={(val) => {
            setLevelFilter(val);
            setPage(1);
          }}
          options={[
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Important", value: "important" },
            { label: "Error", value: "error" },
            { label: "Critical", value: "critical" },
          ]}
        />
        <Input
          placeholder="Buscar por origen..."
          style={{ width: 200 }}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          onPressEnter={() => {
            setPage(1);
            fetchLogs();
          }}
          prefix={<FaSearch className="text-gray-400" />}
        />
        <RangePicker
          showTime
          onChange={(dates) => {
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
            setPage(1);
          }}
        />
        <Button onClick={() => { setPage(1); fetchLogs(); }}>
          Filtrar
        </Button>
        <Button icon={<FaDownload />} onClick={handleExportCSV}>
          Exportar CSV
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="_id"
        loading={loading}
        pagination={false}
        size="small"
        onRow={(record) => ({
          onClick: () => {
            setSelectedLog(record);
            setModalVisible(true);
          },
          style: { cursor: "pointer" },
        })}
      />

      <div className="flex items-center justify-between mt-4">
        <Text className="text-sm text-gray-500">
          {total} registro(s) encontrado(s) — Página {page} de{" "}
          {totalPages || 1}
        </Text>
        <Space>
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </Space>
      </div>

      <Modal
        title="Detalle del log"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <div className="space-y-3">
            <Card size="small">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Text strong>Fecha:</Text>{" "}
                  {dayjs(selectedLog.date).format("YYYY-MM-DD HH:mm:ss")}
                </div>
                <div>
                  <Text strong>Nivel:</Text>{" "}
                  <Tag color={levelColors[selectedLog.level] || "default"}>
                    {selectedLog.level?.toUpperCase()}
                  </Tag>
                </div>
                <div>
                  <Text strong>Origen:</Text> {selectedLog.source}
                </div>
                <div>
                  <Text strong>Duración:</Text>{" "}
                  {selectedLog.duration !== undefined
                    ? `${selectedLog.duration}ms`
                    : "-"}
                </div>
                <div className="col-span-2">
                  <Text strong>Trace ID:</Text>{" "}
                  <Text copyable>{selectedLog.traceId || "-"}</Text>
                </div>
              </div>
            </Card>
            <Card size="small" title="Mensaje">
              <Paragraph>{selectedLog.message}</Paragraph>
            </Card>
            {selectedLog.details &&
              Object.keys(selectedLog.details).length > 0 && (
                <Card size="small" title="Detalles">
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Card>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}
