import { useCallback, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";

import WorkflowsFeature, { WorkflowsAPITypes } from "..";

export type CreateWorkflowModalState =
  WorkflowsAPITypes.CreateRequestBody & {
    isOpen: boolean;
    loading: boolean;
  };

export function useCreateWorkflowModal({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "workflows.hooks.useCreateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message } = App.useApp();

  const defaultState: CreateWorkflowModalState = {
    isOpen: false,
    loading: false,
    name: "",
    url: "",
    allowedRoles: [],
    auth: {
      type: "none"
    },
    type: "n8n",
    description: "",
    isActive: true,
    isRestricted: false,
    protocol: "webhook",
    iconUrl: "",
    tags: [],
  };

  const [state, setState] = useState<CreateWorkflowModalState>(defaultState);

  const createWorkflow = useCallback(async () => {
    if (state.loading) return;

    const parsedData =
      WorkflowsFeature.schemas.createSchema.safeParse(state);
    if (!parsedData.success) {
      parsedData.error.issues.forEach((issue) => {
        message.warning(t(`messages:${issue.message}`));
      });
      return; // stop if validation fails
    }

    setState((prev) => ({ ...prev, loading: true }));
    const result = await WorkflowsFeature.api.create(parsedData.data);

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
    createWorkflow,
    openModal,
    closeModal,
  };
}
