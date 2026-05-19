import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { FaRecycle } from "react-icons/fa";

import type { UpdatePasswordModalState } from "../hooks/useUpdatePassword";

type UpdateAccountPasswordFormProps = {
  state: UpdatePasswordModalState;
  setState: React.Dispatch<React.SetStateAction<UpdatePasswordModalState>>;
  onClose: () => void;
  onUpdatePassword: () => void;
};

export function UpdatePasswordModal({
  state,
  setState,
  onClose,
  onUpdatePassword
}: UpdateAccountPasswordFormProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.components.updatePasswordModal",
  });
  const { t: tCommon } = useTranslation(["common"]);

  return (
    <Modal
      title={t("title")}
      open={state.isOpen}
      onCancel={onClose}
      cancelText={tCommon("cancel")}
      onOk={onUpdatePassword}
      okButtonProps={{
        loading: state.loading,
        icon: <FaRecycle />,
        disabled: state.loading,
      }}
      okText={t("title")}
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.password")} required >
          <Input.Password
            maxLength={256}
            showCount
            value={state.newPassword}
            placeholder={t("fields.passwordPlaceholder")}
            onChange={(e) =>
              setState((prev) => ({ ...prev, newPassword: e.target.value }))
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

