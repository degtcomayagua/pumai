import { Table, Space, Dropdown, Button, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  FaPencilAlt,
  FaTrash,
  FaTrashRestore,
  FaEllipsisH,
} from "react-icons/fa";

import type { ListMCPServer, MCPServersAPITypes } from "..";

import { useSelector } from "react-redux";
import { RootState } from "../../../../src/store";

import { FnFetchMCPServers, NullableMCPServersListState } from "../hooks/useList";

import { hasPermissions } from "../../../utils/permissions";

type MCPServersTableProps = {
  mcpServers: { mcpServers: ListMCPServer[]; totalMCPServers: number };
  mcpServersListState: MCPServersAPITypes.ListRequestBody & { loading: boolean };
  fetchMCPServers: FnFetchMCPServers;
  onUpdate: (mcpServer: ListMCPServer) => void;
  onDelete: (mcpServer: ListMCPServer) => void;
  onRestore: (mcpServer: ListMCPServer) => void;
};

export function MCPServersTable({
  mcpServers,
  mcpServersListState,
  fetchMCPServers,
  onUpdate,
  onDelete,
  onRestore,
}: MCPServersTableProps) {
  const { t } = useTranslation(["features"], {
    keyPrefix: "mcp-servers.components.table",
  });
  const { account } = useSelector((state: RootState) => state.auth);

  return (
    <div className="mt-4">
      <Table
        className="w-full overflow-x-scroll"
        dataSource={mcpServers.mcpServers}
        columns={[
          {
            title: t("name"),
            key: "name",
            dataIndex: "name",
            render: (_: any, record: ListMCPServer) => (
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
            render: (_: any, mcpServer: ListMCPServer) => {
              if (mcpServer.deleted || !mcpServer.isActive) {
                return <Tag color="red">{t("inactive")}</Tag>;
              }

              return <Tag color="green">{t("active")}</Tag>;
            },
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
            render: (_: any, record: ListMCPServer) => {
              const accountPermissions = account?.data.role.permissions || [];
              const canUpdate =
                hasPermissions(accountPermissions, ["mcp-servers:update"])
              const canDelete =
                hasPermissions(accountPermissions, ["mcp-servers:delete"])
              const canRestore =
                hasPermissions(accountPermissions, ["mcp-servers:restore"])

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
          pageSize: mcpServersListState.count,
          total: mcpServers.totalMCPServers,
          current: mcpServersListState.page + 1,
          showTotal: (total, range) =>
            t("total", {
              total: total,
              range: range[0] + "-" + range[1],
            }),
          showSizeChanger: true,
          onChange: (current, size) => {
            fetchMCPServers({
              count: size,
              page: current - 1,
            });
          },
        }}
        rowKey="id"
        loading={mcpServersListState.loading}
      />
    </div>
  );
}
