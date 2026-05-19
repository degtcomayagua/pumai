import { useCallback, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";

import AccountRolesFeature from "..";
import { RolesAPITypes } from "..";

export interface UpdateDrawerState extends RolesAPITypes.UpdateRequestBody {
  loading: boolean;
  isOpen: boolean;
}

export function useUpdateDrawer({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.hooks.useUpdateDrawer",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const { message } = App.useApp();

  const defaultState: UpdateDrawerState = {
    loading: false,
    isOpen: false,
    roleId: "",
    name: "",
    description: "",
    level: 1,
    permissions: [],
    requiresTwoFactor: false,
  };

  const [state, setState] = useState<UpdateDrawerState>(defaultState);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const openDrawer = useCallback(
    async (roleId: string) => {
      setState((prev) => ({ ...prev, loading: true }));

      const result = await AccountRolesFeature.api.get({
        roleIds: [roleId],
        fields: [
          "id",
          "name",
          "description",
          "level",
          "permissions",
          "requiresTwoFactor",
        ],
      });

      if (
        result.status === "success" &&
        result.accountRoles &&
        result.accountRoles.length > 0
      ) {
        const role = result.accountRoles[0];
        const permissions = (role.permissions ?? "")
          .split(",")
          .map((permission) => permission.trim())
          .filter(Boolean);

        console.log("Fetched role permissions:", permissions);

        const values: UpdateDrawerState = {
          loading: false,
          isOpen: true,
          roleId: role.id,
          name: role.name ?? "",
          description: role.description ?? "",
          level: role.level ?? 0,
          permissions,
          requiresTwoFactor: role.requiresTwoFactor ?? false,
        };

        setState(values);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
        message.error(tErrorMessages("internal-error"));
      }
    },
    [message, tErrorMessages],
  );

  const update = useCallback(async () => {
    if (state.loading) return;

    const values: RolesAPITypes.UpdateRequestBody = {
      roleId: state.roleId,
      name: state.name || undefined,
      description: state.description,
      level: state.level,
      permissions: state.permissions,
      requiresTwoFactor: state.requiresTwoFactor,
    };

    const result = AccountRolesFeature.schemas.updateSchema.safeParse(values);

    if (!result.success || !result.data) {
      for (const issue of result.error.issues) {
        message.warning(t(`messages.${issue.message}`));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const response = await AccountRolesFeature.api.update(result.data);

    if (response.status === "success") {
      message.success(t("messages.success"));
      reset();

      if (onSuccess) {
        onSuccess();
      }
      return;
    }

    if (
      response.status === "level-in-use" ||
      response.status === "level-too-high" ||
      response.status === "role-not-found"
    ) {
      message.warning(t(`messages.${response.status}`));
    } else {
      message.error(tErrorMessages(`${response.status}`));
    }

    setState((prev) => ({ ...prev, loading: false }));
  }, [message, onSuccess, reset, state, t, tErrorMessages]);

  return {
    state,
    setState,
    reset,
    update,
    openDrawer,
  };
}
