import { useCallback, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";

import MCPServersFeature, { MCPServersAPITypes } from "..";

export type CreateRagDocumentModalState =
  MCPServersAPITypes.CreateRequestBody & {
    isOpen: boolean;
    loading: boolean;
  };

export function useCreateRagDocumentModal({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "mcpServers.hooks.useCreateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message } = App.useApp();

  const defaultState: CreateRagDocumentModalState = {
    isOpen: false,
    loading: false,
    name: "",
    url: "",
    allowedRoles: [],
    auth: {
      type: "none"
    },
    description: "",
    isActive: true,
    isRestricted: false,
    protocol: "streamable_http",
    iconUrl: "",
    tags: [],
  };

  const [state, setState] = useState<CreateRagDocumentModalState>(defaultState);

  const createDocument = useCallback(async () => {
    if (state.loading) return;

    const parsedData =
      MCPServersFeature.schemas.createSchema.safeParse(state);
    if (!parsedData.success) {
      parsedData.error.issues.forEach((issue) => {
        message.warning(t(`messages:${issue.message}`));
      });
      return; // stop if validation fails
    }

    setState((prev) => ({ ...prev, loading: true }));
    const result = await MCPServersFeature.api.create(parsedData.data);

    if (result.status === "success") {
      message.success(t("messages.success"));
      setState(defaultState);
      onSuccess?.();
    } else {
      setState((prev) => ({ ...prev, loading: false }));
      message.error(tErrorMessages(result.status));
    }
  }, [state, message, t, tErrorMessages, onSuccess]);

  const openModal = useCallback(
    () => setState((prev) => ({ ...prev, isOpen: true })),
    [],
  );

  const closeModal = useCallback(() => setState(defaultState), []);

  return {
    state,
    setState,
    createDocument,
    openModal,
    closeModal,
  };
}
