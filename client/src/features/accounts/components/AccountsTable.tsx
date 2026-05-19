import React from "react";
import { useTranslation } from "react-i18next";

import { Table, Space, Dropdown, Button, Tag, Select } from "antd";
import {
  FaPencilAlt,
  FaTrash,
  FaTrashRestore,
  FaEllipsisH,
  FaKey,
  FaFlag,
  FaFilter,
} from "react-icons/fa";

import type { ListAccount } from "..";
import { FetchAccountsFn, NullableAccountsListState } from "../hooks/useAccountsList";

import type { Permission } from "../../../../../shared/types/permissions";
import { useSelector } from "react-redux";
import { RootState } from "client/src/store";
import { hasPermissions } from "client/src/utils/permissions";
import { CampusCode } from "@shared/models";

type AccountsTableProps = {
  accounts: { accounts: ListAccount[]; totalAccounts: number };
  accountsListState: NullableAccountsListState & { loading: boolean; count: number; page: number };
  fetchAccounts: FetchAccountsFn;
  onUpdate: (account: ListAccount) => void;
  onChangePassword: (account: ListAccount) => void;
  onUpdateStatus: (account: ListAccount) => void;
  onDelete: (account: ListAccount) => void;
  onRestore: (account: ListAccount) => void;
  accountRoles?: { id: string; name: string; level: number }[];
};

export function AccountsTable({
  accounts,
  accountsListState,
  fetchAccounts,
  onUpdate,
  onDelete,
  onRestore,
  onUpdateStatus,
  onChangePassword,
  accountRoles = [],
}: AccountsTableProps) {
  const { t: tComponent } = useTranslation(["features"], {
    keyPrefix: "accounts.components.table",
  });
  const { t: tCampus } = useTranslation(["campus"]);

  const { account } = useSelector((state: RootState) => state.auth);
  const accountLevel = account?.data.role.level || 0;
  const accountPermissions = account?.data.role.permissions || [];

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
            title: tComponent("status"),
            key: "status",
            dataIndex: "status",
            render: (_: any, record: ListAccount) => (
              <Tag color={record.status === "active" ? "green" : "red"}>
                {tComponent(record.status)}
              </Tag>
            ),
            filterIcon: () => {
              const hasFilter =
                (accountsListState.filters ?? {}).status !== undefined;
              return (
                <FaFilter className={`${hasFilter ? "text-blue-500" : ""}`} />
              );
            },
            filterDropdown: () => {
              return (
                <Space className="p-2 flex gap-2 items-center">
                  <Select
                    placeholder={tComponent("filterStatusPlaceholder")}
                    allowClear
                    onClear={() => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...accountsListState.filters,
                          status: undefined,
                        },
                      });
                    }}
                    value={(accountsListState.filters ?? {}).status}
                    options={[
                      { label: tComponent("active"), value: "active" },
                      { label: tComponent("inactive"), value: "inactive" },
                    ] as { label: string; value: string }[]}
                    onChange={(val) => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...(accountsListState.filters ?? {}),
                          status: val,
                        },
                      });
                    }}
                  />
                </Space>
              );
            },
          },
          {
            title: tComponent("campus"),
            key: "campus",
            dataIndex: "campus",
            render: (_: any, record: ListAccount) => (
              <Tag color="blue">{tCampus(record.campus)}</Tag>
            ),
            filterIcon: () => {
              const hasFilter =
                (accountsListState.filters ?? {}).campus !== undefined;
              return (
                <FaFilter className={`${hasFilter ? "text-blue-500" : ""}`} />
              );
            },
            filterDropdown: () => {
              return (
                <Space className="p-2 flex gap-2 items-center">
                  <Select
                    placeholder={tComponent("filterCampusPlaceholder")}
                    allowClear
                    onClear={() => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...accountsListState.filters,
                          campus: undefined,
                        },
                      });
                    }}
                    value={(accountsListState.filters ?? {}).campus}
                    options={[
                      { label: "Comayagua", value: "COMAYAGUA" },
                      { label: "Tegucigalpa", value: "TEGUCIGALPA" },
                      { label: "San Pedro Sula", value: "SANPEDRO" },
                      { label: "Olancho", value: "OLANCHO" },
                      { label: "La Ceiba", value: "LA_CEIBA" },
                      { label: "Choluteca", value: "CHOLUTECA" },
                      { label: "Danlí", value: "DANLI" },
                      { label: "Santa Rosa de Copán", value: "SANTA_ROSA" },
                    ] as { label: string; value: CampusCode }[]}
                    onChange={(val) => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...(accountsListState.filters ?? {}),
                          campus: val,
                        },
                      });
                    }}
                  />
                </Space>
              );
            },
          },

          {
            title: tComponent("email"),
            render: (_: any, record: ListAccount) => <p>{record.email}</p>,
          },
          {
            title: tComponent("role"),
            render: (_: any, record: ListAccount) => (
              <p>
                {record.role.name} ({record.role.level})
              </p>
            ),
            filterIcon: () => {
              const hasFilter =
                (accountsListState.filters ?? {}).role !== undefined;
              return (
                <FaFilter className={`${hasFilter ? "text-blue-500" : ""}`} />
              );
            },
            filterDropdown: () => {
              return (
                <Space className="p-2 flex gap-2 items-center">
                  <Select
                    placeholder={tComponent("filterRolePlaceholder")}
                    allowClear
                    onClear={() => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...accountsListState.filters,
                          role: undefined,
                        },
                      });
                    }}
                    value={(accountsListState.filters ?? {}).role}
                    options={accountRoles.map((role) => ({
                      label: `${role.name} (${role.level})`,
                      value: role.id,
                    }))}
                    onChange={(val) => {
                      fetchAccounts({
                        page: 0,
                        filters: {
                          ...(accountsListState.filters ?? {}),
                          role: val,
                        },
                      });
                    }}
                  />
                </Space>
              );
            },
          },
          {
            title: tComponent("actions"),
            key: "actions",
            fixed: "right",
            render: (_: any, record: ListAccount) => {
              const canUpdateStatus = hasPermissions(accountPermissions, [
                "accounts:update-status",
              ]) &&
                record.role.level > accountLevel;

              const canChangePassword =
                hasPermissions(accountPermissions, [
                  "accounts:change-password",
                ]) &&
                record.role.level > accountLevel;
              const canUpdate =
                hasPermissions(accountPermissions, [
                  "accounts:update",
                ]) &&
                record.role.level > accountLevel;
              const canDelete =
                hasPermissions(accountPermissions, [
                  "accounts:delete",
                ]) &&
                record.role.level > accountLevel &&
                !record.deleted;
              const canRestore =
                hasPermissions(accountPermissions, [
                  "accounts:restore",
                ]) &&
                record.role.level > accountLevel &&
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
        rowKey="id"
        loading={accountsListState.loading}
      />
    </div>
  );
}
