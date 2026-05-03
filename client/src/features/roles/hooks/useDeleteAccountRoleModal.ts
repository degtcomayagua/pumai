import { useTranslation } from "react-i18next";
import { App } from "antd";
import { useState, useCallback } from "react";

import AccountRolesFeature, { AccountRole, RolesAPITypes } from "../";

export type DeleteAccountRoleModalState = RolesAPITypes.DeleteRequestBody & {
  isOpen: boolean;
  loading: boolean;
};

export function useDeleteAccountRoleModal({
  onSuccess,
}: {
  onSuccess: (account: AccountRole) => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.hooks.useDeleteModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message } = App.useApp();

  const defaultState: DeleteAccountRoleModalState = {
    isOpen: false,
    loading: false,
    roleId: "",
  };

  const [state, setState] = useState<DeleteAccountRoleModalState>(defaultState);

  const deleteAccount = useCallback(async () => {
    if (state.loading) return;

    const parsedData =
      AccountRolesFeature.schemas.deleteSchema.safeParse(state);
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
    const result = await AccountRolesFeature.api.delete(parsedData.data);
    if (result.status == "success" && result.accountRole !== undefined) {
      message.success(t("messages.success"));
      setState(defaultState);

      // Then we add the variant to the list
      if (onSuccess) onSuccess(result.accountRole);
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
      message.error(tErrorMessages(`${result.status}`));
    }
  }, [state, message, t]);

  const openModal = useCallback(
    (roleId: string) => setState((prev) => ({ ...prev, isOpen: true, roleId })),
    [],
  );
  const closeModal = useCallback(() => setState(defaultState), []);

  return {
    state,
    setState,
    deleteAccount,
    openModal,
    closeModal,
  };
}
