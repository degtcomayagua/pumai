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
  FaRecycle,
  FaServer,
  FaTrash,
  FaTrashRestore,
} from "react-icons/fa";

import WorkflowsFeature from "../../../features/workflows";

export const Route = createFileRoute("/admin/workflows/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.workflows",
  });
  const { t: tCommon } = useTranslation(["common"]);

  // List
  const { workflows, fetchWorkflows, workflowsListState } =
    WorkflowsFeature.hooks.useWorkflowsList({});

  // Create
  const {
    state: createWorkflowState,
    setState: setCreateWorkflowState,
    openModal: openCreateWorkflowModal,
    closeModal: closeCreateWorkflowModal,
    createWorkflow,
  } = WorkflowsFeature.hooks.useCreateWorkflowModal({
    onSuccess: async () => {
      await fetchWorkflows({ count: 50, page: 0 });
    },
  });

  // Delete 
  const handleDeleteMCPServer = async (workflowId: string) => {
    const result = await WorkflowsFeature.api.delete({ workflowId });
    if (result.status == "success") {
      message.success(tPage("messages.delete.success"));
      await fetchWorkflows({ count: 50, page: 0 });
    } else {
      console.log(result);
      message.error(tPage("messages.delete.error"));
    }
  }

  // Restore 
  const handleRestoreMCPServer = async (workflowId: string) => {
    const result = await WorkflowsFeature.api.restore({ workflowId });
    if (result.status == "success") {
      message.success(tPage("messages.restore.success"));
      await fetchWorkflows({ count: 50, page: 0 });
    } else {
      console.log(result);
      message.error(tPage("messages.restore.error"));
    }
  }

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
        await fetchWorkflows({ count: 50, page: 0 });
      })();
    }
  }, [account]);

  return (
    <AdminPageLayout selectedPage="deterministic-workflows">
      <WorkflowsFeature.components.CreateWorkflowsDrawer
        setState={setCreateWorkflowState}
        state={createWorkflowState}
        onClose={closeCreateWorkflowModal}
        onCreate={async () => {
          await createWorkflow();
        }}
      />

      <Title className="flex items-center gap-2">
        <FaRecycle />
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
              account?.data.role.permissions!.includes("workflows:create")
            )
          }
          onClick={() => {
            openCreateWorkflowModal();
          }}
          icon={<FaPlus />}
        >
          {tPage("createWorkflow")}
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
            fetchWorkflows({
              search: {
                query: query.trim(),
                searchIn: ["name"],
              },
              count: 50,
              page: 0,
            });
          }}
          loading={workflowsListState.loading}
          enterButton={tCommon("search")}
          placeholder={tPage("searchPlaceholder")}
        />
      </div>

      {/* Documents List */}
      {account && (
        <WorkflowsFeature.components.WorkflowsTable
          fetchWorkflows={fetchWorkflows}
          workflows={workflows}
          workflowsListState={workflowsListState}
          onRestore={(workflow) => {
            modal.confirm({
              title: tPage("modals.restore.title"),
              content: tPage("modals.restore.content"),
              icon: <FaTrashRestore />,
              cancelText: tCommon("cancel"),
              okText: tCommon("confirm"),
              onOk: async () => {
                handleRestoreMCPServer(workflow.id);
              }
            })
          }}
          onDelete={(workflow) => {
            modal.confirm({
              title: tPage("modals.delete.title"),
              content: tPage("modals.delete.content"),
              icon: <FaTrash />,
              cancelText: tCommon("cancel"),
              okText: tCommon("confirm"),
              onOk: async () => {
                handleDeleteMCPServer(workflow.id);
              }
            })
          }}
          onUpdate={async (workflow) => { }}
        />
      )}

      <div className="flex mt-4 gap-2 items-center">
        <Switch
          id="page-show-deleted"
          checked={workflowsListState.includeDeleted}
          onChange={(value) => {
            fetchWorkflows({
              includeDeleted: value,
            });
          }}
        />

        <label htmlFor="page-show-deleted">{tPage("showDeleted")}</label>
      </div>
    </AdminPageLayout>
  );
}

