import { useState, useCallback } from "react";

import RAGDocumentsFeature, {
  RAGDocumentsAPITypes,
  ListRAGDocument,
} from "../";
import { useTranslation } from "react-i18next";
import { App } from "antd";

type NullableRAGDocumentsListState = {
  [K in keyof RAGDocumentsAPITypes.ListRequestBody]?:
  | RAGDocumentsAPITypes.ListRequestBody[K]
  | null;
};

type UseRagDocumentsListOptions = {
  apiList?: typeof RAGDocumentsFeature.api.list;
};

export function useRagDocumentsList({
  apiList = RAGDocumentsFeature.api.list,
}: UseRagDocumentsListOptions) {
  const { message } = App.useApp();
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [ragDocumentsListState, setRagDocumentsListState] = useState<
    RAGDocumentsAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: [
      "id",
      "title",
      "category",
      "authorityLevel",
      "sourceType",
      "campuses",
      "deliveryModes",
      "effectiveFrom",
      "effectiveUntil",
      "archived",
      "warningCampusSpecific",
      "warningLegal",
      "warningTimeSensitive",
      "summary",
      "tags",
      "metadata.deleted",
      "metadata.createdAt"
    ],
    count: 50,
    page: 0,
  });

  const [ragDocuments, setRagDocuments] = useState<{
    totalRagDocuments: number;
    ragDocuments: ListRAGDocument[];
  }>({
    ragDocuments: [],
    totalRagDocuments: 0,
  });

  const fetchRagDocuments = useCallback(
    async ({
      count = ragDocumentsListState.count,
      page = ragDocumentsListState.page,
      includeDeleted = ragDocumentsListState.includeDeleted,
      search = ragDocumentsListState.search,
    }: NullableRAGDocumentsListState = {}) => {
      setRagDocumentsListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...ragDocumentsListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success") {
        setRagDocumentsListState((prev) => ({
          ...prev,
          count: count as number,
          page: page as number,
          search: search == null ? undefined : search,
          includeDeleted: includeDeleted == null ? undefined : includeDeleted,
          loading: false,
        }));

        setRagDocuments({
          ragDocuments: result.ragDocuments!.map((doc) => ({
            id: doc.id.toString(),
            title: doc.title,
            category: doc.category,
            authorityLevel: doc.authorityLevel,
            campuses: doc.campuses.map((campus) => campus.campus),
            effective: {
              from: doc.effectiveFrom,
              until: doc.effectiveUntil,
            },
            tags: doc.tags.map((tag) => tag.tag),
            createdAt: doc.metadata?.createdAt ?? new Date(0),
            deleted: doc.metadata?.deleted ?? false,
          })),
          totalRagDocuments: result.totalRagDocuments ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setRagDocumentsListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [ragDocumentsListState, message, tErrorMessages],
  );

  return {
    ragDocumentsListState,
    ragDocuments,
    fetchRagDocuments,
    // setRagDocumentsListState, // expose if you want external control
  };
}
