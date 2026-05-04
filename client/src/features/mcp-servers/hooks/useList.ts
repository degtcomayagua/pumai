import { useState, useCallback } from "react";

import MCPServersFeature, { MCPServersAPITypes, ListMCPServer } from "..";
import { useTranslation } from "react-i18next";
import { App } from "antd";

export type NullableMCPServersListState = {
  [K in keyof MCPServersAPITypes.ListRequestBody]?:
  | MCPServersAPITypes.ListRequestBody[K]
  | null;
};

export type FnFetchMCPServers = (
  params?: NullableMCPServersListState,
) => Promise<void>;

type UseMCPServerListOptions = {
  apiList?: typeof MCPServersFeature.api.list;
};

export function useMCPServerList({
  apiList = MCPServersFeature.api.list,
}: UseMCPServerListOptions) {
  const { message } = App.useApp();
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [mcpServersListState, setMCPServersListState] = useState<
    MCPServersAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: [
      "id",
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

  const [mcpServers, setMCPServers] = useState<{
    totalMCPServers: number;
    mcpServers: ListMCPServer[];
  }>({
    mcpServers: [],
    totalMCPServers: 0,
  });

  const fetchMCPServers = useCallback(
    async ({
      count = mcpServersListState.count,
      page = mcpServersListState.page,
      includeDeleted = mcpServersListState.includeDeleted,
      search = mcpServersListState.search,
    }: NullableMCPServersListState = {}) => {
      setMCPServersListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...mcpServersListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success") {
        setMCPServersListState((prev) => ({
          ...prev,
          count: count as number,
          page: page as number,
          search: search == null ? undefined : search,
          includeDeleted: includeDeleted == null ? undefined : includeDeleted,
          loading: false,
        }));

        setMCPServers({
          mcpServers: result.mcpServers!.map((server) => ({
            id: server.id.toString(),
            name: server.name,
            url: server.url,
            isActive: server.isActive,
            authType: server.authType,
            createdAt: server.metadata?.createdAt ?? new Date(0),
            deleted: server.metadata?.deleted ?? false,
          })),
          totalMCPServers: result.totalMcpServers ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setMCPServersListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [mcpServersListState, message, tErrorMessages],
  );

  return {
    mcpServersListState,
    mcpServers,
    fetchMCPServers,
  };
}
