import { useState, useCallback } from "react";

import { useTranslation } from "react-i18next";
import { App } from "antd";

import AccountsFeature, { AccountAPITypes } from "..";

export type UpdateDrawerState = AccountAPITypes.UpdateRequestBody & {
  loading: boolean;
  isOpen: boolean;
};

export function useUpdateModal({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.hooks.useUpdateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const { message } = App.useApp();

  const defaultState: UpdateDrawerState = {
    loading: false,
    isOpen: false,
    accountId: "",
    name: "",
    email: "",
    roleId: "",
    campus: "COMAYAGUA",
  };
  const [state, setState] = useState<UpdateDrawerState>(defaultState);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const openModal = useCallback(async (accountId: string) => {
    setState((prev) => ({ ...prev, loading: true }));

    const result = await AccountsFeature.api.get({
      accountIds: [accountId],
      fields: ["id", "name", "email", "role", "campus"],
      populate: ["role"],
    });
    if (
      result.status === "success" &&
      result.accounts &&
      result.accounts.length > 0
    ) {
      const account = result.accounts[0];
      setState((prev) => ({
        ...prev,
        loading: false,
        isOpen: true,
        accountId: account.id,
        name: account.name,
        email: account.email,
        roleId: account.roleId,
        campus: account.campus,
      }));
    }
  }, []);

  const update = useCallback(async () => {
    if (state.loading) return;

    const parsed = AccountsFeature.schemas.updateSchema.safeParse(state);
    if (!parsed.success || !parsed.data) {
      for (const issue of parsed.error.issues) {
        message.warning(t(`messages.${issue.message}`));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const result = await AccountsFeature.api.update(parsed.data);
    if (result.status === "success") {
      message.success(t("messages.success"));
      reset();

      if (onSuccess) onSuccess();
      return;
    } else if (
      result.status === "email-in-use" ||
      result.status === "account-not-found" ||
      result.status === "role-cannot-be-assigned"
    ) {
      message.warning(t(`messages.${result.status}`));
    } else {
      message.error(tErrorMessages(`${result.status}`));
    }
    setState((prev) => ({ ...prev, loading: false }));
  }, [state, reset]);

  return {
    state,
    setState,
    reset,
    update,
    openModal,
  };
}
