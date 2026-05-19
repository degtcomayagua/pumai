import { useTranslation } from "react-i18next";
import { App } from "antd";
import { useState, useCallback } from "react";

import AccountsFeature, { Account, AccountAPITypes } from "../";

export type CreateAccountModalState = AccountAPITypes.CreateRequestBody & {
  isOpen: boolean;
  loading: boolean;
};

export function useCreateModal({
  onSuccess,
}: {
  onSuccess: (account: Account) => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.hooks.useCreateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message } = App.useApp();

  const defaultState: CreateAccountModalState = {
    isOpen: false,
    loading: false,
    name: "",
    email: "",
    password: "",
    roleId: "",
    campus: "COMAYAGUA",
  };

  const [state, setState] = useState<CreateAccountModalState>(defaultState);

  const createAccount = useCallback(async () => {
    if (state.loading) return;

    const parsedData = AccountsFeature.schemas.createSchema.safeParse(state);
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
    const result = await AccountsFeature.api.create(parsedData.data);
    if (result.status == "success" && result.account !== undefined) {
      message.success(t("messages.success"));
      setState(defaultState);

      // Then we add the variant to the list
      if (onSuccess) onSuccess(result.account);
      return;
    } else if (
      result.status == "email-in-use" ||
      result.status == "role-not-found" ||
      result.status == "role-cannot-be-assigned"
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
