import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import { App, Button, Input, Modal, Drawer, Typography, Switch } from "antd";
const { Title, Text } = Typography;

import AdminPageLayout from "../../../layouts/Admin";
import {
  FaFile,
  FaPlus,
  FaServer,
} from "react-icons/fa";

import MCPServersFeature from "../../../features/mcp-servers";
import { AccountRole } from "../../../features/roles";

export const Route = createFileRoute("/admin/mcp-servers/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.mcp-servers",
  });
  const { t: tCommon } = useTranslation(["common"]);

  // List
  const { mcpServers, fetchMCPServers, mcpServersListState } =
    MCPServersFeature.hooks.useMCPServerList({});

  // Create
  const {
    state: createMCPServerState,
    setState: setCreateMCPState,
    openModal: openCreateMCPServerModal,
    closeModal: closeCreateMCPServerModal,
    createDocument: createMCPServer,
  } = MCPServersFeature.hooks.useCreateRagDocumentModal({
    onSuccess: async () => {
      await fetchMCPServers({ count: 50, page: 0 });
    },
  });

  useEffect(() => {
    if (!account) return; // Admin layout will handle this
    if (
      !account.data.role.permissions!.includes("mcp-servers:read") &&
      !account.data.role.permissions!.includes("*")
    ) {
      message.error(tPage("error-messages:forbidden"));
      navigate({ to: "/admin" });
      return;
    } else {
      (async () => {
        await fetchMCPServers({ count: 50, page: 0 });
      })();
    }
  }, [account]);

  return (
    <AdminPageLayout selectedPage="mcp-servers">
      <MCPServersFeature.components.CreateRagDocumentDrawer
        setState={setCreateMCPState}
        state={createMCPServerState}
        onClose={closeCreateMCPServerModal}
        onCreate={async () => {
          await createMCPServer();
        }}
      />

      <Title className="flex items-center gap-2">
        <FaServer />
        {tPage("title")}
      </Title>

      <Text>{tPage("description")}</Text>

      <div className="my-2 flex items-center gap-2">
        <Button
          variant="solid"
          type="primary"
          disabled={
            !account ||
            !(
              account?.data.role.permissions!.includes("*") ||
              account?.data.role.permissions!.includes("mcp-servers:create")
            )
          }
          onClick={() => {
            openCreateMCPServerModal();
          }}
          icon={<FaPlus />}
        >
          {tPage("createServer")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <Input.Search
          type="text"
          variant="outlined"
          allowClear
          onSearch={(query) => {
            if (!query || query.trim() === "") return;
            fetchMCPServers({
              search: {
                query: query.trim(),
                searchIn: ["name"],
              },
              count: 50,
              page: 0,
            });
          }}
          loading={mcpServersListState.loading}
          enterButton={tCommon("search")}
          placeholder={tPage("searchPlaceholder")}
        />
      </div>

      {/* Documents List */}
      {account && (
        <MCPServersFeature.components.MCPServersTable
          fetchMCPServers={fetchMCPServers}
          mcpServers={mcpServers}
          mcpServersListState={mcpServersListState}
          onRestore={(server) => { }}
          onUpdate={async (server) => { }}
          onDelete={(server) => { }}
        />
      )}

      <div className="flex mt-4 gap-2 items-center">
        <Switch
          id="page-show-deleted"
          checked={mcpServersListState.includeDeleted}
          onChange={(value) => {
            fetchMCPServers({
              includeDeleted: value,
            });
          }}
        />

        <label htmlFor="page-show-deleted">{tPage("showDeleted")}</label>
      </div>
    </AdminPageLayout>
  );
}
