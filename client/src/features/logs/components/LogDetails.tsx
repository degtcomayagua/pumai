import { useEffect, useMemo, useState } from "react";

import { Card, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import logsApi from "../api";
import type { ListLog } from "..";

const { Paragraph, Text } = Typography;

const levelColors: Record<string, string> = {
  info: "blue",
  warning: "orange",
  important: "purple",
  error: "red",
  critical: "volcano",
  debug: "default",
};

type PopulatedDetailValue = {
  value: unknown;
  document: unknown;
};

const isPopulatedDetailValue = (
  value: unknown,
): value is PopulatedDetailValue => {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "document" in value
  );
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

type LogDetailsProps = {
  open: boolean;
  log: ListLog | null;
  onClose: () => void;
};

export default function LogDetails({ open, log, onClose }: LogDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ListLog | null>(null);
  const { t } = useTranslation(["features"], {
    keyPrefix: "logs.components.details",
  });

  const populate = useMemo(
    () => Object.keys(log?._references ?? {}),
    [log?._references],
  );

  useEffect(() => {
    if (!open || !log?._id) {
      setSelectedLog(null);
      return;
    }

    let active = true;

    const fetchLog = async () => {
      setLoading(true);
      const result = await logsApi.get({
        logIds: [log._id],
        populate,
        fields: [
          "_id",
          "date",
          "source",
          "level",
          "message",
          "duration",
          "details",
          "traceId",
          "_references",
          "metadata",
        ],
      });

      if (!active) {
        return;
      }

      if (result.status === "success" && result.logs?.length) {
        const fetchedLog = result.logs[0] as any;
        setSelectedLog({
          ...log,
          ...fetchedLog,
        });
      } else {
        setSelectedLog(log);
      }

      setLoading(false);
    };

    void fetchLog();

    return () => {
      active = false;
    };
  }, [open, log, populate]);

  const currentLog = selectedLog ?? log;

  return (
    <Drawer
      title={currentLog ? currentLog.message : t("drawerTitleFallback")}
      open={open}
      onClose={onClose}
      width={920}
      destroyOnClose
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      )}

      {!loading && currentLog && (
        <div className="space-y-4">
          <Card size="small">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label={t("fields.date")}>
                {dayjs(currentLog.date).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label={t("fields.level")}>
                <Tag color={levelColors[currentLog.level] || "default"}>
                  {currentLog.level?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("fields.source")}>
                {currentLog.source || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("fields.duration")}>
                {currentLog.duration !== undefined && currentLog.duration !== null
                  ? `${currentLog.duration}ms`
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("fields.traceId")} span={2}>
                <Text copyable>{currentLog.traceId || "-"}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title={t("cards.message")}>
            <Paragraph className="mb-0">{currentLog.message}</Paragraph>
          </Card>

          <Card size="small" title={t("cards.details")}>
            {currentLog.details && Object.keys(currentLog.details).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(currentLog.details).map(([key, value]) => {
                  const displayValue = isPopulatedDetailValue(value)
                    ? value.value
                    : value;
                  const documentValue = isPopulatedDetailValue(value)
                    ? value.document
                    : undefined;

                  return (
                    <Card key={key} size="small" type="inner" title={key} className="my-2">
                      <div className="space-y-2">
                        <div>
                          <Text strong>{t("fields.value")}</Text>
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-900 p-2 text-xs overflow-auto">
                            {formatValue(displayValue)}
                          </pre>
                        </div>

                        {documentValue !== undefined && (
                          <div>
                            <Text strong>{t("fields.relatedDocument")}</Text>
                            <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-900 p-2 text-xs overflow-auto">
                              {formatValue(documentValue)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Text type="secondary">{t("emptyDetails")}</Text>
            )}
          </Card>

          {currentLog._references && Object.keys(currentLog._references).length > 0 && (
            <Card size="small" title={t("cards.references")}>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentLog._references).map(([key, modelName]) => (
                  <Tag key={key} color="geekblue">
                    {key}: {modelName}
                  </Tag>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!loading && !currentLog && (
        <div className="py-8 text-center text-gray-500">{t("loadError")}</div>
      )}
    </Drawer>
  );
}