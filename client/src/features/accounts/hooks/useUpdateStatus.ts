import { useState, useCallback } from "react";

import { useTranslation } from "react-i18next";
import { App } from "antd";

import AccountsFeature, { AccountAPITypes } from "..";

export type UpdateStatusModalState = AccountAPITypes.UpdateStatusRequestBody & {
  loading: boolean;
  isOpen: boolean;
};

export function useUpdateStatusModal({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.hooks.useUpdateStatusModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const { message } = App.useApp();

  const defaultState: UpdateStatusModalState = {
    loading: false,
    isOpen: false,
    accountId: "",
    newStatus: "active",
  };
  const [state, setState] = useState<UpdateStatusModalState>(defaultState);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const openModal = useCallback(async (accountId: string) => {
    setState((prev) => ({ ...prev, isOpen: true, accountId }));
  }, []);

  const closeModal = useCallback(() => {
    setState(defaultState);
  }, []);

  const updateStatus = useCallback(async () => {
    if (state.loading) return;

    const parsed = AccountsFeature.schemas.updateStatusSchema.safeParse(state);
    if (!parsed.success || !parsed.data) {
      for (const issue of parsed.error.issues) {
        message.warning(t(`messages.${issue.message}`));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const result = await AccountsFeature.api.updateStatus(parsed.data);
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
    updateStatus,
    openModal,
    closeModal,
  };
}
