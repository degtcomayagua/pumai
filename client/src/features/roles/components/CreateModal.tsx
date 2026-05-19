import { Form, Input, InputNumber, Modal } from "antd";

import { useTranslation } from "react-i18next";

import { CreateAccountRoleModalState } from "../hooks/useCreateModal";
import { FaPlus } from "react-icons/fa";

type CreateAccountRoleModalProps = {
  state: CreateAccountRoleModalState;
  setState: React.Dispatch<React.SetStateAction<CreateAccountRoleModalState>>;
  onClose: () => void;
  onCreate: () => void;
};

export function CreateModal({
  onCreate,
  onClose,
  state,
  setState,
}: CreateAccountRoleModalProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.components.createModal",
  });
  const { t: tCommon } = useTranslation(["common"]);

  return (
    <Modal
      title={t("title")}
      open={state.isOpen}
      onCancel={onClose}
      cancelText={tCommon("cancel")}
      onOk={onCreate}
      okButtonProps={{
        loading: state.loading,
        icon: <FaPlus />,
        disabled: state.loading,
      }}
      okText={t("title")}
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.name")} required>
          <Input
            placeholder={t("fields.namePlaceholder")}
            max={100}
            count={{
              max: 100,
              show: true,
            }}
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.description")}>
          <Input
            max={500}
            count={{
              max: 500,
              show: true,
            }}
            value={state.description}
            placeholder={t("fields.descriptionPlaceholder")}
            onChange={(e) =>
              setState((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </Form.Item>

        <Form.Item label={t("fields.level")} required>
          <InputNumber
            className="w-full"
            min={0}
            max={1000} // Arbitrary upper bound for sanity
            precision={0}
            style={{ width: "100%" }}
            type="number"
            variant="outlined"
            value={state.level}
            placeholder={t("fields.levelPlaceholder")}
            onChange={(value) =>
              setState((prev) => ({
                ...prev,
                level: value as number,
              }))
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
