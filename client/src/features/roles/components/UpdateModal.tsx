import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Collapse, Drawer, Input, InputNumber, Switch } from "antd";

import { FaSave } from "react-icons/fa";
import type { Dispatch, SetStateAction } from "react";

import permissionsArray from "../../../../../shared/constants/permissions";
import type { UpdateDrawerState } from "../hooks/useUpdateDrawer";

type UpdateDrawerProps = {
  state: UpdateDrawerState;
  setState: Dispatch<SetStateAction<UpdateDrawerState>>;
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
};

export function UpdateDrawer({
  state,
  setState,
  onClose,
  onUpdate,
}: UpdateDrawerProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.components.updateModal",
  });
  const { t: tPermissions } = useTranslation(["permissions"]);
  const { t: tCommon } = useTranslation(["common"]);
  const selectedPermissions = state.permissions ?? [];

  const permissionCategories = useMemo(() => {
    const categories: string[] = [];

    for (const permission of permissionsArray) {
      if (permission === "*" || permission === "*:*") continue;

      const [category] = permission.split(":");
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }

    return categories;
  }, []);

  const permissionItems = useMemo(() => {
    const items: Record<string, string[]> = {};

    for (const permission of permissionsArray) {
      if (permission === "*" || permission === "*:*") continue;

      const [category] = permission.split(":");
      if (!items[category]) {
        items[category] = [];
      }

      items[category].push(permission);
    }

    return items;
  }, []);

  const [activePermissionKeys, setActivePermissionKeys] = useState<string[]>([
    "reports",
  ]);

  useEffect(() => {
    const selectedCategories = Array.from(
      new Set(selectedPermissions.map((permission) => permission.split(":")[0])),
    );

    setActivePermissionKeys(
      selectedCategories.length > 0 ? selectedCategories : ["reports"],
    );
  }, [selectedPermissions]);

  const getPermissionLabel = (permission: string) => {
    let separated = permission.split(":");
    if (separated.length == 1) {
      return tPermissions(`permissions.${permission}`);
    } else {
      return tPermissions(`permissions:${separated.join(".")}`)
    }
  };

  return (
    <Drawer
      width={1000}
      title={t("title")}
      open={state.isOpen}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button
          type="primary"
          variant="solid"
          onClick={onUpdate}
          loading={state.loading}
          icon={<FaSave />}
        >
          {tCommon("save")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-medium">{t("fields.name")}</label>
          <Input
            value={state.name}
            placeholder={t("fields.namePlaceholder")}
            disabled={state.loading}
            onChange={(event) =>
              setState((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">{t("fields.description")}</label>
          <Input
            value={state.description}
            placeholder={t("fields.descriptionPlaceholder")}
            disabled={state.loading}
            onChange={(event) =>
              setState((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">{t("fields.level")}</label>
          <InputNumber
            className="w-full"
            min={0}
            style={{
              display: "block",
              width: "100%",
            }}
            value={state.level}
            placeholder={t("fields.levelPlaceholder")}
            disabled={state.loading}
            onChange={(value) =>
              setState((prev) => ({
                ...prev,
                level: typeof value === "number" ? value : 0,
              }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">{t("fields.permissions")}</label>
          <Checkbox.Group
            className="w-full"
            value={selectedPermissions}
            disabled={state.loading}
            onChange={(checkedValues) => {
              setState((prev) => ({
                ...prev,
                permissions: checkedValues as string[],
              }));
            }}
          >
            <Collapse
              className="w-full"
              activeKey={activePermissionKeys}
              onChange={(keys) => {
                setActivePermissionKeys(Array.isArray(keys) ? keys : [keys]);
              }}
              items={permissionCategories.map((category) => ({
                key: category,
                label: tPermissions(`${category}`),
                children: (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {permissionItems[category].map((permission) => (
                      <Checkbox
                        key={permission}
                        value={permission}
                      >
                        {getPermissionLabel(permission)}
                      </Checkbox>
                    ))}
                  </div>
                ),
              }))}
              destroyOnHidden={false}
            />
          </Checkbox.Group>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={state.requiresTwoFactor}
            disabled={state.loading}
            onChange={(checked) =>
              setState((prev) => ({ ...prev, requiresTwoFactor: checked }))
            }
          />
          <span>{t("fields.requiresTwoFactor", { defaultValue: "Requiere 2FA" })}</span>
        </div>
      </div>
    </Drawer>
  );
}
