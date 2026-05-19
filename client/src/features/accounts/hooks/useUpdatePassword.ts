import { useState, useCallback } from "react";

import { useTranslation } from "react-i18next";
import { App } from "antd";

import AccountsFeature, { AccountAPITypes } from "..";

export type UpdatePasswordModalState =
  AccountAPITypes.UpdatePasswordRequestBody & {
    loading: boolean;
    isOpen: boolean;
  };

export function useUpdatePasswordModal({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.hooks.useUpdatePasswordModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const { message } = App.useApp();

  const defaultState: UpdatePasswordModalState = {
    loading: false,
    isOpen: false,
    accountId: "",
    newPassword: "",
  };
  const [state, setState] = useState<UpdatePasswordModalState>(defaultState);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const openModal = useCallback(async (accountId: string) => {
    setState((prev) => ({ ...prev, isOpen: true, accountId }));
  }, []);

  const closeModal = useCallback(() => {
    setState(defaultState);
  }, []);

  const updatePassword = useCallback(async () => {
    if (state.loading) return;

    console.log(state);

    const parsed =
      AccountsFeature.schemas.updatePasswordSchema.safeParse(state);
    if (!parsed.success || !parsed.data) {
      for (const issue of parsed.error.issues) {
        message.warning(t(`messages.${issue.message}`));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const result = await AccountsFeature.api.updatePassword(parsed.data);
    if (result.status === "success") {
      message.success(t("messages.success"));
      reset();

      if (onSuccess) onSuccess();
    } else {
      message.error(tErrorMessages(`${result.status}`));
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state, reset]);

  return {
    state,
    setState,
    reset,
    updatePassword,
    openModal,
    closeModal,
  };
}
