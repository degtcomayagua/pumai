import { useTranslation } from "react-i18next";

import { Table, Space, Dropdown, Button, Tag } from "antd";
import {
  FaPencilAlt,
  FaTrash,
  FaTrashRestore,
  FaEllipsisH,
  FaKey,
  FaFlag,
} from "react-icons/fa";

import type { ListAccount } from "..";
import type { Permission } from "../../../../../shared/types/permissions";

type AccountsTableProps = {
  accounts: { accounts: ListAccount[]; totalAccounts: number };
  accountsListState: {
    count: number;
    page: number;
    loading: boolean;
  };
  fetchAccounts: (params: { count: number; page: number }) => void;
  accountPermissions: Permission[]; // current user permissions
  accountLevel: number;
  onUpdate: (account: ListAccount) => void;
  onChangePassword: (account: ListAccount) => void;
  onUpdateStatus: (account: ListAccount) => void;
  onDelete: (account: ListAccount) => void;
  onRestore: (account: ListAccount) => void;
};

export function AccountsTable({
  accounts,
  accountsListState,
  fetchAccounts,
  accountPermissions,
  accountLevel,
  onUpdate,
  onDelete,
  onRestore,
  onUpdateStatus,
  onChangePassword,
}: AccountsTableProps) {
  const { t: tComponent } = useTranslation(["features"], {
    keyPrefix: "accounts.components.table",
  });

  return (
    <div className="mt-4">
      <Table
        className="w-full overflow-x-scroll"
        dataSource={accounts.accounts}
        columns={[
          {
            title: tComponent("name"),
            key: "name",
            dataIndex: "name",
            render: (_: any, record: ListAccount) => (
              <span>
                {record.name}{" "}
                {record.deleted ? (
                  <Tag color="red">{tComponent("deleted")}</Tag>
                ) : (
                  ""
                )}
              </span>
            ),
          },
          {
            title: tComponent("email"),
            render: (_: any, record: ListAccount) => <p>{record.email}</p>,
          },
          {
            filterSearch: true,
            onFilter: (value, record: ListAccount) => record.role._id === value,
            title: tComponent("role"),
            render: (_: any, record: ListAccount) => (
              <p>
                {record.role.name} ({record.role.level})
              </p>
            ),
          },
          {
            title: tComponent("actions"),
            key: "actions",
            fixed: "right",
            render: (_: any, record: ListAccount) => {
              const canUpdateStatus =
                (accountPermissions.includes("*") ||
                  accountPermissions.includes("accounts:update-status")) &&
                record.role.level >= accountLevel;
              const canChangePassword =
                (accountPermissions.includes("*") ||
                  accountPermissions.includes("accounts:change-password")) &&
                record.role.level >= accountLevel;
              const canUpdate =
                (accountPermissions.includes("*") ||
                  accountPermissions.includes("accounts:update")) &&
                record.role.level >= accountLevel;
              const canDelete =
                (accountPermissions.includes("*") ||
                  accountPermissions.includes("accounts:delete")) &&
                record.role.level >= accountLevel &&
                !record.deleted;
              const canRestore =
                (accountPermissions.includes("*") ||
                  accountPermissions.includes("accounts:restore")) &&
                record.role.level >= accountLevel &&
                record.deleted;

              const menuItems = !record.deleted
                ? [
                    {
                      key: "update",
                      label: tComponent("actionButtons.update"),
                      icon: <FaPencilAlt />,
                      disabled: !canUpdate,
                      onClick: () => onUpdate(record),
                    },
                    {
                      key: "change-password",
                      label: tComponent("actionButtons.changePassword"),
                      icon: <FaKey />,
                      disabled: !canChangePassword,
                      onClick: () => onChangePassword(record),
                    },
                    {
                      key: "update-status",
                      label: tComponent("actionButtons.updateStatus"),
                      icon: <FaFlag />,
                      disabled: !canUpdateStatus,
                      onClick: () => onUpdateStatus(record),
                    },
                    {
                      key: "delete",
                      label: tComponent("actionButtons.delete"),
                      danger: true,
                      icon: <FaTrash />,
                      disabled: !canDelete,
                      onClick: () => onDelete(record),
                    },
                  ]
                : [
                    {
                      key: "restore",
                      label: tComponent("actionButtons.restore"),
                      icon: <FaTrashRestore />,
                      disabled: !canRestore || !record.deleted,
                      className: record.deleted ? "hidden" : "",
                      onClick: () => onRestore(record),
                    },
                  ];

              return (
                <Space>
                  <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                    <Button icon={<FaEllipsisH />}>
                      {tComponent("actionButtons.trigger")}
                    </Button>
                  </Dropdown>
                </Space>
              );
            },
          },
        ]}
        pagination={{
          pageSize: accountsListState.count,
          total: accounts.totalAccounts,
          current: accountsListState.page + 1,
          showTotal: (total, range) =>
            tComponent("total", {
              total: total,
              range: range[0] + "-" + range[1],
            }),
          showSizeChanger: true,
          onChange: (current, size) => {
            console.log(current, size);
            fetchAccounts({
              count: size,
              page: current - 1,
            });
          },
        }}
        rowKey="_id"
        loading={accountsListState.loading}
      />
    </div>
  );
}
