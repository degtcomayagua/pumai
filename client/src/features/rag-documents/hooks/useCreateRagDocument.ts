import { useCallback, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";

import RagDocumentsFeature, { RAGDocumentsAPITypes } from "../";

export type CreateRagDocumentModalState =
  RAGDocumentsAPITypes.CreateRequestBody & {
    isOpen: boolean;
    loading: boolean;
  };

export function useCreateRagDocumentModal({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "rag-documents.hooks.useCreateModal",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);
  const { message, modal } = App.useApp();

  const defaultState: CreateRagDocumentModalState = {
    isOpen: false,
    loading: false,
    sourceType: "official",
    campuses: ["COMAYAGUA"],
    deliveryModes: ["hybrid"],
    authorityLevel: 1,
    category: "regulation",
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: new Date().toISOString(),
    tags: [],
    summary: "",
    warnings: {
      campusSpecific: "",
      legal: "",
      timeSensitive: "",
    },
    title: "",
    contentType: "text",
    content: "",
  };

  const [state, setState] = useState<CreateRagDocumentModalState>(defaultState);

  const createDocument = useCallback(async () => {
    if (state.loading) return;

    const parsedData =
      RagDocumentsFeature.schemas.createSchema.safeParse(state);
    if (!parsedData.success) {
      parsedData.error.issues.forEach((issue) => {
        message.warning(t(`messages:${issue.message}`));
      });
      return; // stop if validation fails
    }

    setState((prev) => ({ ...prev, loading: true }));
    const result = await RagDocumentsFeature.api.create(parsedData.data);

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

  const closeModal = useCallback(() => {
    modal.confirm({
      title: t("modals.confirmClose.title"),
      content: t("modals.confirmClose.content"),
      onOk: () => setState(defaultState),
    });
  }, []);

  return {
    state,
    setState,
    createDocument,
    openModal,
    closeModal,
  };
}
