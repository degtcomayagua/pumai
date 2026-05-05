import { useState, useCallback } from "react";

import WorkflowsFeature, { WorkflowsAPITypes, ListWorkflow } from "..";
import { useTranslation } from "react-i18next";
import { App } from "antd";

export type NullableWorkflowsListState = {
  [K in keyof WorkflowsAPITypes.ListRequestBody]?:
  | WorkflowsAPITypes.ListRequestBody[K]
  | null;
};

export type FnFetchWorkflows = (
  params?: NullableWorkflowsListState,
) => Promise<void>;

type UseWorkflowsListOptions = {
  apiList?: typeof WorkflowsFeature.api.list;
};

export function useWorkflowsList({
  apiList = WorkflowsFeature.api.list,
}: UseWorkflowsListOptions) {
  const { message } = App.useApp();
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [workflowsListState, setWorkflowsListState] = useState<
    WorkflowsAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: [
      "id",
      "type",
      "name",
      "url",
      "isActive",
      "authType",
      "metadata.deleted",
      "metadata.createdAt",
    ],
    count: 50,
    page: 0,
  });

  const [workflows, setWorkflows] = useState<{
    totalWorkflows: number;
    workflows: ListWorkflow[];
  }>({
    workflows: [],
    totalWorkflows: 0,
  });

  const fetchWorkflows = useCallback(
    async ({
      count = workflowsListState.count,
      page = workflowsListState.page,
      includeDeleted = workflowsListState.includeDeleted,
      search = workflowsListState.search,
    }: NullableWorkflowsListState = {}) => {
      setWorkflowsListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...workflowsListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success") {
        setWorkflowsListState((prev) => ({
          ...prev,
          count: count as number,
          page: page as number,
          search: search == null ? undefined : search,
          includeDeleted: includeDeleted == null ? undefined : includeDeleted,
          loading: false,
        }));

        setWorkflows({
          workflows: result.workflows!.map((workflow) => ({
            id: workflow.id.toString(),
            name: workflow.name,
            url: workflow.url,
            type: workflow.type,
            isActive: workflow.isActive,
            authType: workflow.authType,
            createdAt: workflow.metadata?.createdAt ?? new Date(0),
            deleted: workflow.metadata?.deleted ?? false,
          })),
          totalWorkflows: result.totalWorkflows ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setWorkflowsListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [workflowsListState, message, tErrorMessages],
  );

  return {
    workflowsListState,
    workflows,
    fetchWorkflows,
  };
}
