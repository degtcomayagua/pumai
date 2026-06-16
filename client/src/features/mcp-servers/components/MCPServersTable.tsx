import { Table, Space, Dropdown, Button, Tag, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import {
  FaPencilAlt,
  FaTrash,
  FaTrashRestore,
  FaEllipsisH,
  FaSearch,
  FaFilter,
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


const SimpleTextSearch = ({
  fetchMCPServers,
  searchIn,
}: {
  fetchMCPServers: FnFetchMCPServers;
  searchIn: NonNullable<
    MCPServersAPITypes.ListRequestBody["search"]
  >["searchIn"];
}) => {
  const { t } = useTranslation(["common"]);

  return (
    <Input.Search
      placeholder={t("search")}
      maxLength={100}
      showCount
      onSearch={(query) => {
        fetchMCPServers({ search: { query, searchIn } });
      }}
      allowClear
      onClear={() => {
        fetchMCPServers({ search: null });
      }}
    />
  );
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
            filterIcon: () => {
              const hasFilter =
                mcpServersListState.search?.searchIn.includes("name");
              return (
                <FaSearch className={`${hasFilter ? "text-blue-500" : ""}`} />
              );
            },
            filterDropdown: () => {
              return (
                <SimpleTextSearch
                  searchIn={["name"]}
                  fetchMCPServers={fetchMCPServers}
                />
              );
            },
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
            filterIcon: () => {
              const hasFilter =
                (mcpServersListState.filters ?? {}).isActive !== undefined;
              return (
                <FaFilter className={`${hasFilter ? "text-blue-500" : ""}`} />
              );
            },
            filterDropdown: () => {
              return (
                <Space className="p-2 flex gap-2 items-center">
                  <Select
                    placeholder={t("filterIsActivePlaceholder")}
                    allowClear
                    onClear={() => {
                      fetchMCPServers({
                        page: 0,
                        filters: {
                          ...mcpServersListState.filters,
                          isActive: undefined,
                        },
                      });
                    }}
                    value={(mcpServersListState.filters ?? {}).isActive}
                    options={
                      [
                        { label: t("active"), value: true },
                        { label: t("inactive"), value: false },
                      ] as { label: string; value: boolean }[]
                    }
                    onChange={(val) => {
                      fetchMCPServers({
                        page: 0,
                        filters: {
                          ...(mcpServersListState.filters ?? {}),
                          isActive: val,
                        },
                      });
                    }}
                  />
                </Space>
              );
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
