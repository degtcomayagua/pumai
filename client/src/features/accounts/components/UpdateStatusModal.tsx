import { Form, Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";
import { FaRecycle } from "react-icons/fa";

import type { UpdateStatusModalState } from "../hooks/useUpdateStatus";

type UpdateAccountStatusFormProps = {
  state: UpdateStatusModalState;
  setState: React.Dispatch<React.SetStateAction<UpdateStatusModalState>>;
  onClose: () => void;
  onUpdateStatus: () => void;
};

export function UpdateStatusModal({
  state,
  setState,
  onClose,
  onUpdateStatus
}: UpdateAccountStatusFormProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.components.updateStatusModal",
  });
  const { t: tCommon } = useTranslation(["common"]);

  return (
    <Modal
      title={t("title")}
      open={state.isOpen}
      onCancel={onClose}
      cancelText={tCommon("cancel")}
      onOk={onUpdateStatus}
      okButtonProps={{
        loading: state.loading,
        icon: <FaRecycle />,
        disabled: state.loading,
      }}
      okText={t("title")}
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.status")} required >
          <Select
            value={state.newStatus}
            placeholder={t("fields.statusPlaceholder")}
            onChange={(value) =>
              setState((prev) => ({ ...prev, newStatus: value }))
            }
          >
            <Select.Option value="active">{t("fields.statuses.active")}</Select.Option>
            <Select.Option value="inactive">{t("fields.statuses.inactive")}</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}


