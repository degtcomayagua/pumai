import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  DatePicker,
  Drawer,
  Button,
} from "antd";
import dayjs from "dayjs";
import { FaUpload } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import type { CreateRagDocumentModalState } from "../hooks/useCreateRagDocument";

export function CreateRagDocumentDrawer({
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
    keyPrefix: "rag-documents.components.createModal",
  });
  const { t: tCommon } = useTranslation(["common"]);

  const CAMPUS_OPTIONS = [
    "COMAYAGUA",
    "TEGUCIGALPA",
    "SANPEDRO",
    "CHOLUTECA",
    "LA CEIBA",
    "DANLI",
    "SANTA ROSA",
    "GLOBAL",
  ].map((c) => ({ label: c, value: c }));

  const DELIVERY_MODE_OPTIONS = [
    { value: "onsite", label: t("fields.deliveryModesOptions.onsite") },
    { value: "online", label: t("fields.deliveryModesOptions.online") },
    { value: "hybrid", label: t("fields.deliveryModesOptions.hybrid") },
  ];

  const CATEGORY_OPTIONS = [
    { value: "regulation", label: t("fields.categoryOptions.regulation") },
    {
      value: "administrative",
      label: t("fields.categoryOptions.administrative"),
    },
    {
      value: "campus_service",
      label: t("fields.categoryOptions.campus_service"),
    },
    { value: "student_life", label: t("fields.categoryOptions.student_life") },
    { value: "support", label: t("fields.categoryOptions.support") },
  ];

  const SOURCE_TYPE_OPTIONS = [
    { value: "official", label: t("fields.sourceTypeOptions.official") },
    {
      value: "approved_student",
      label: t("fields.sourceTypeOptions.approved_student"),
    },
  ];

  return (
    <Drawer
      title={t("title")}
      open={state.isOpen}
      width={1000}
      extra={
        <div className="flex gap-2 items-center justify-center">
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button
            type="primary"
            loading={state.loading}
            onClick={onCreate}
            disabled={state.loading || !state.content}
          >
            {t("title")}
          </Button>
        </div>
      }
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.contentType")} required>
          <Select
            placeholder={t("fields.selectPlaceholder")}
            options={[{ label: "Text", value: "text" }]}
            value="text"
            disabled
            onChange={() => { }}
          />
        </Form.Item>

        <Form.Item label={t("fields.content")} required>
          <Input.TextArea
            rows={6}
            maxLength={5000}
            placeholder={t("fields.contentPlaceholder")}
            value={state.content}
            onChange={(e) =>
              setState((prev) => ({ ...prev, content: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.title")} required>
          <Input
            maxLength={200}
            placeholder={t("fields.titlePlaceholder")}
            value={state.title}
            onChange={(e) =>
              setState((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.category")} required>
          <Select
            placeholder={t("fields.categoryPlaceholder")}
            options={CATEGORY_OPTIONS}
            value={state.category}
            onChange={(value) =>
              setState((prev) => ({ ...prev, category: value }))
            }
          />
        </Form.Item>

        <Form.Item
          label={t("fields.authorityLevel")}
          tooltip={t("fields.authorityLevelHint")}
          required
        >
          <InputNumber
            min={0}
            max={1000}
            precision={0}
            style={{ width: "100%" }}
            className="w-full"
            value={state.authorityLevel}
            onChange={(value) =>
              setState((prev) => ({ ...prev, authorityLevel: value ?? 0 }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.sourceType")} required>
          <Select
            placeholder={t("fields.sourceTypePlaceholder")}
            options={SOURCE_TYPE_OPTIONS}
            value={state.sourceType}
            onChange={(value) =>
              setState((prev) => ({ ...prev, sourceType: value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.campuses")} required>
          <Select
            mode="multiple"
            placeholder={t("fields.campusesPlaceholder")}
            options={CAMPUS_OPTIONS}
            value={state.campuses}
            onChange={(value) =>
              setState((prev) => ({ ...prev, campuses: value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.deliveryModes")} required>
          <Select
            mode="multiple"
            placeholder={t("fields.deliveryModesPlaceholder")}
            options={DELIVERY_MODE_OPTIONS}
            value={state.deliveryModes}
            onChange={(value) =>
              setState((prev) => ({ ...prev, deliveryModes: value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.effectiveFrom")} required>
          <DatePicker
            className="w-full"
            value={state.effectiveFrom ? dayjs(state.effectiveFrom) : null}
            onChange={(date) =>
              setState((prev) => ({
                ...prev,
                effectiveFrom: date?.toISOString(),
              }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.effectiveUntil")}>
          <DatePicker
            className="w-full"
            value={state.effectiveUntil ? dayjs(state.effectiveUntil) : null}
            onChange={(date) =>
              setState((prev) => ({
                ...prev,
                effectiveUntil: date ? date.toISOString() : null,
              }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.summary")} required>
          <Input.TextArea
            rows={4}
            maxLength={5000}
            value={state.summary}
            onChange={(e) =>
              setState((prev) => ({ ...prev, summary: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.tags")}>
          <Select
            mode="tags"
            placeholder={t("fields.tagsPlaceholder")}
            value={state.tags}
            onChange={(value) => setState((prev) => ({ ...prev, tags: value }))}
          />
        </Form.Item>

        <Form.Item label={t("fields.warnings")}>
          <Input
            placeholder={t("fields.warningsLegal")}
            value={state.warnings?.legal || ""}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                warnings: { ...prev.warnings, legal: e.target.value },
              }))
            }
          />
          <Input
            placeholder={t("fields.warningsTimeSensitive")}
            value={state.warnings?.timeSensitive || ""}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                warnings: { ...prev.warnings, timeSensitive: e.target.value },
              }))
            }
          />
          <Input
            placeholder={t("fields.warningsCampusSpecific")}
            value={state.warnings?.campusSpecific || ""}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                warnings: { ...prev.warnings, campusSpecific: e.target.value },
              }))
            }
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
