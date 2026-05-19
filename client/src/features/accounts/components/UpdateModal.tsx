import { Form, Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";
import { FaRecycle } from "react-icons/fa";

import type { UpdateDrawerState } from "../hooks/useUpdateModal";
import { CampusCode } from "@prisma/client";

type UpdateModalProps = {
  state: UpdateDrawerState;
  setState: React.Dispatch<React.SetStateAction<UpdateDrawerState>>;
  onClose: () => void;
  onUpdate: () => void;
  accountRoles?: { id: string; name: string; level: number }[];
};

export function UpdateModal({
  state,
  setState,
  onClose,
  onUpdate,
  accountRoles = [],
}: UpdateModalProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.components.updateModal",
  });
  const { t: tCommon } = useTranslation(["common"]);

  return (
    <Modal
      title={t("title")}
      open={state.isOpen}
      onCancel={onClose}
      cancelText={tCommon("cancel")}
      onOk={onUpdate}
      okButtonProps={{
        loading: state.loading,
        icon: <FaRecycle />,
        disabled: state.loading,
      }}
      okText={t("title")}
    >
      <Form layout="vertical">
        <Form.Item label={t("fields.name")} required >
          <Input
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={state.loading}
          />
        </Form.Item>
        <Form.Item label={t("fields.email")} required >
          <Input
            value={state.email}
            onChange={(e) =>
              setState((prev) => ({ ...prev, email: e.target.value }))
            }
            disabled={state.loading}
          />
        </Form.Item>
        <Form.Item label={t("fields.role")} required >
          <Select
            value={state.roleId}
            onChange={(val) =>
              setState((prev) => ({ ...prev, roleId: val }))
            }
            defaultValue={state.roleId}
            disabled={state.loading}
            options={accountRoles.map((role) => ({
              label: `${role.name} (${role.level})`,
              value: role.id,
            }))}
          />
        </Form.Item>
        <Form.Item label={t("fields.campus")} required >
          <Select
            placeholder={t("fields.campusPlaceholder")}
            options={[
              { label: "Comayagua", value: "COMAYAGUA" },
              { label: "Tegucigalpa", value: "TEGUCIGALPA" },
              { label: "San Pedro Sula", value: "SANPEDRO" },
              { label: "Olancho", value: "OLANCHO" },
              { label: "La Ceiba", value: "LA_CEIBA" },
              { label: "Choluteca", value: "CHOLUTECA" },
              { label: "Danlí", value: "DANLI" },
              { label: "Santa Rosa de Copán", value: "SANTA_ROSA" },
            ] as { label: string; value: CampusCode }[]}
            value={state.campus}
            onChange={(value) =>
              setState((prev) => ({ ...prev, campus: value }))
            } />
        </Form.Item>
      </Form>
    </Modal>
  );
}


