import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  DatePicker,
  Drawer,
  Button,
  Radio,
} from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { CreateRagDocumentModalState } from "../hooks/useCreateDrawer";

export function CreateMCPServerDrawer({
  state,
  setState,
  onClose,
  onCreate,
}: {
  state: CreateRagDocumentModalState;
  setState: React.Dispatch<React.SetStateAction<CreateRagDocumentModalState>>;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "mcp-servers.components.createDrawer",
  });
  const { t: tCommon } = useTranslation(["common"]);

  return (
    <Drawer
      title={t("title")}
      open={state.isOpen}
      width={1000}
      onClose={() => {
        onClose();
      }}
      extra={
        <div className="flex gap-2 items-center justify-center">
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button
            type="primary"
            loading={state.loading}
            onClick={onCreate}
            disabled={state.loading}
          >
            {t("title")}
          </Button>
        </div>
      }
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.name.label")} required>
          <Input
            placeholder={t("fields.name.placeholder")}
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.description.label")}>
          <Input
            placeholder={t("fields.description.placeholder")}
            value={state.description}
            onChange={(e) =>
              setState((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.url.label")} required>
          <Input
            placeholder={t("fields.url.placeholder")}
            value={state.url}
            onChange={(e) =>
              setState((prev) => ({ ...prev, url: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.protocol.label")} required>
          <Radio.Group
            value={state.protocol}
            onChange={(e) =>
              setState((prev) => ({ ...prev, protocol: e.target.value }))
            }
            options={[
              {
                label: t("fields.protocol.options.streamable_http"),
                value: "streamable_http",
              },
              {
                label: t("fields.protocol.options.sse"),
                value: "sse",
              },
            ]}
          />
        </Form.Item>

        <Form.Item label={t("fields.authType.label")} required>
          <Radio.Group
            value={state.auth.type}
            onChange={(e) =>
              setState((prev) => ({ ...prev, auth: { ...prev.auth, type: e.target.value } }))
            }
            options={[
              {
                label: t("fields.authType.options.none"),
                value: "none",
              },
            ]}
          />
        </Form.Item>

      </Form>
    </Drawer>
  );
}
