import { useTranslation } from "react-i18next";
import { Form, Input, Collapse, Checkbox, InputNumber } from "antd";

import { RolesAPITypes } from "../";
import { FormInstance } from "antd/lib";

import permissionsArray from "../../../../../shared/constants/permissions";

type UpdateAccountRoleFormProps = {
  form: FormInstance<RolesAPITypes.UpdateRequestBody>;
  defaultValues: RolesAPITypes.UpdateRequestBody;
  onValuesChange?: (
    changedValues: any,
    allValues: RolesAPITypes.UpdateRequestBody,
  ) => void;
};

export function UpdateAccountRoleForm({
  form,
  defaultValues,
  onValuesChange,
}: UpdateAccountRoleFormProps) {
  const { t } = useTranslation(["main"]);

  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={defaultValues}
      onValuesChange={onValuesChange}
    >
      <Form.Item
        label={t("dashboard:roles.modals.update.fields.name")}
        required
        name="name"
      >
        <Input
          placeholder={t(
            "dashboard:roles.modals.update.fields.namePlaceholder",
          )}
        />
      </Form.Item>

      <Form.Item
        label={t("dashboard:roles.modals.update.fields.description")}
        name="description"
      >
        <Input
          placeholder={t(
            "dashboard:roles.modals.update.fields.descriptionPlaceholder",
          )}
        />
      </Form.Item>

      <Form.Item
        label={t("dashboard:roles.modals.update.fields.level")}
        name="level"
        required
      >
        <InputNumber
          className="w-full"
          min={0}
          placeholder={t(
            "dashboard:roles.modals.update.fields.levelPlaceholder",
          )}
        />
      </Form.Item>

      <Form.Item
        label={t("dashboard:roles.modals.update.fields.permissions")}
        required
        name="permissions"
      >
        <Checkbox.Group
          onChange={(checkedValues) => {
            // checkedValues is string[] with all selected permissions
            form.setFieldValue("permissions", checkedValues);
          }}
          className="w-full"
        >
          <Collapse
            className="w-full"
            items={(() => {
              const permissionCategories = permissionsArray.reduce(
                (acc, permission) => {
                  if (permission === "*" || permission === "*:*") return acc;
                  const category = permission.split(":")[0];
                  return acc.includes(category) ? acc : [...acc, category];
                },
                [] as string[],
              );

              const permissionItems: Record<string, string[]> = {};
              for (const permission of permissionsArray) {
                if (permission === "*" || permission === "*:*") continue;
                const [category, action] = permission.split(":");
                if (!permissionItems[category]) {
                  permissionItems[category] = [];
                }
                permissionItems[category].push(action);
              }

              return permissionCategories.map((category) => ({
                key: category,
                label: t(`permissions:${category}`),
                children: (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {permissionItems[category].map((action) => (
                      <Checkbox
                        key={`${category}:${action}`}
                        value={`${category}:${action}`}
                      >
                        {t(`permissions:${category}:${action}`)}
                      </Checkbox>
                    ))}
                  </div>
                ),
              }));
            })()}
            defaultActiveKey={["products"]}
            destroyOnHidden={false} // Keep all mounted to avoid unmount issues
          />
        </Checkbox.Group>
      </Form.Item>
    </Form>
  );
}
