import { useTranslation } from "react-i18next";
import { App } from "antd";
import { useState, useCallback } from "react";

import AccountRolesFeature, { AccountRole, RolesAPITypes } from "..";

export type CreateAccountRoleModalState = RolesAPITypes.CreateRequestBody & {
  isOpen: boolean;
  loading: boolean;
};

export function useCreateModal({
  onSuccess,
}: {
  onSuccess: (account: AccountRole) => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.hooks.useCreateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message } = App.useApp();

  const defaultState: CreateAccountRoleModalState = {
    isOpen: false,
    loading: false,
    name: "",
    level: 0,
    description: "",
  };

  const [state, setState] = useState<CreateAccountRoleModalState>(defaultState);

  const createAccount = useCallback(async () => {
    if (state.loading) return;

    const parsedData =
      AccountRolesFeature.schemas.createSchema.safeParse(state);
    if (!parsedData.success) {
      for (const issue of parsedData.error.issues) {
        message.warning(t(`messages.${issue.message}`));
      }
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
    }));
    const result = await AccountRolesFeature.api.create(parsedData.data);
    if (result.status == "success" && result.accountRole !== undefined) {
      message.success(t("messages.success"));
      setState(defaultState);

      // Then we add the variant to the list
      if (onSuccess) onSuccess(result.accountRole);
      return;
    } else if (
      result.status == "level-too-high" ||
      result.status == "level-in-use"
    ) {
      message.warning(t(`messages.${result.status}`));
    } else {
      message.error(tErrorMessages(`${result.status}`));
    }

    setState((prev) => ({
      ...prev,
      loading: false,
    }));
  }, [state, message, t]);

  const openModal = useCallback(
    () => setState((prev) => ({ ...prev, isOpen: true })),
    [],
  );
  const closeModal = useCallback(() => setState(defaultState), []);

  return {
    state,
    setState,
    createAccount,
    openModal,
    closeModal,
  };
}
