import { Table, Space, Dropdown, Button, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  FaPencilAlt,
  FaTrash,
  FaTrashRestore,
  FaEllipsisH,
} from "react-icons/fa";

import type { ListWorkflow, WorkflowsAPITypes } from "..";

import { useSelector } from "react-redux";
import { RootState } from "../../../store";

import { FnFetchWorkflows } from "../hooks/useList";

import { hasPermissions } from "../../../utils/permissions";

type WorkflowsTableProps = {
  workflows: { workflows: ListWorkflow[]; totalWorkflows: number };
  workflowsListState: WorkflowsAPITypes.ListRequestBody & { loading: boolean };
  fetchWorkflows: FnFetchWorkflows;
  onUpdate: (workflow: ListWorkflow) => void;
  onDelete: (workflow: ListWorkflow) => void;
  onRestore: (workflow: ListWorkflow) => void;
};

export function WorkflowsTable({
  workflows,
  workflowsListState,
  fetchWorkflows,
  onUpdate,
  onDelete,
  onRestore,
}: WorkflowsTableProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "workflows.components.table",
  });
  const { account } = useSelector((state: RootState) => state.auth);

  return (
    <div className="mt-4">
      <Table
        className="w-full overflow-x-scroll"
        dataSource={workflows.workflows}
        columns={[
          {
            title: t("name"),
            key: "name",
            dataIndex: "name",
            render: (_: any, record: ListWorkflow) => (
              <span>
                {record.name}{" "}
                {record.deleted && <Tag color="red">{t("deleted")}</Tag>}
              </span>
            ),
          },
          {
            title: t("url"),
            key: "url",
            dataIndex: "url",
          },
          {
            title: t("isActive"),
            key: "isActive",
            render: (_: any, workflow: ListWorkflow) => {
              if (workflow.deleted || !workflow.isActive) {
                return <Tag color="red">{t("inactive")}</Tag>;
              }

              return <Tag color="green">{t("active")}</Tag>;
            },
          },
          {
            title: t("type"),
            key: "type",
            dataIndex: "type",
            render: (type: "n8n" | "custom") => {
              let color = "default";
              if (type === "n8n") color = "green";
              else if (type === "custom") color = "blue";

              return <Tag color={color}>{type.toUpperCase()}</Tag>;
            }
          },

          {
            title: t("authType"),
            key: "authType",
            dataIndex: "authType",
            render: (authType: string) => {
              let color = "default";
              if (authType === "none") color = "green";
              else if (authType === "basic") color = "blue";
              else if (authType === "bearer") color = "purple";

              return <Tag color={color}>{authType.toUpperCase()}</Tag>;
            }
          },
          {
            title: t("createdAt"),
            key: "createdAt",
            dataIndex: "createdAt",
            render: (createdAt: Date) =>
              new Date(createdAt).toLocaleString(),
          },
          {
            title: t("actions"),
            key: "actions",
            fixed: "right",
            render: (_: any, record: ListWorkflow) => {
              const accountPermissions = account?.data.role.permissions || [];
              const canUpdate =
                hasPermissions(accountPermissions, ["workflows:update"])
              const canDelete =
                hasPermissions(accountPermissions, ["workflows:delete"])
              const canRestore =
                hasPermissions(accountPermissions, ["workflows:restore"])

              const menuItems = !record.deleted
                ? [
                  {
                    key: "update",
                    label: t("actionButtons.update"),
                    icon: <FaPencilAlt />,
                    disabled: !canUpdate,
                    onClick: () => onUpdate(record),
                  },
                  {
                    key: "delete",
                    label: t("actionButtons.delete"),
                    danger: true,
                    icon: <FaTrash />,
                    disabled: !canDelete,
                    onClick: () => onDelete(record),
                  },
                ]
                : [
                  {
                    key: "restore",
                    label: t("actionButtons.restore"),
                    icon: <FaTrashRestore />,
                    disabled: !canRestore,
                    onClick: () => onRestore(record),
                  },
                ];

              return (
                <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                  <Button icon={<FaEllipsisH />}>
                    {t("actionButtons.trigger")}
                  </Button>
                </Dropdown>
              );
            },
          },
        ]}
        pagination={{
          pageSize: workflowsListState.count,
          total: workflows.totalWorkflows,
          current: workflowsListState.page + 1,
          showTotal: (total, range) =>
            t("total", {
              total: total,
              range: range[0] + "-" + range[1],
            }),
          showSizeChanger: true,
          onChange: (current, size) => {
            fetchWorkflows({
              count: size,
              page: current - 1,
            });
          },
        }}
        rowKey="id"
        loading={workflowsListState.loading}
      />
    </div>
  );
}
