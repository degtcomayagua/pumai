import { useState, useCallback } from "react";

import AccountRolesFeature, { RolesAPITypes } from "../";
import { useTranslation } from "react-i18next";
import { App } from "antd";

interface ListAccountRole {
  id: string;
  name: string;
  level: number;
  totalPermissions: number;
  createdAt: Date;
  deleted: boolean;
}

type NullableAccountsListState = {
  [K in keyof RolesAPITypes.ListRequestBody]?:
  | RolesAPITypes.ListRequestBody[K]
  | null;
};

type UseAccountRolesListOptions = {
  apiList?: typeof AccountRolesFeature.api.list;
};

export function useAccountRolesList({
  apiList = AccountRolesFeature.api.list,
}: UseAccountRolesListOptions) {
  const { message } = App.useApp();

  const { t } = useTranslation(["features"], {
    keyPrefix: "account-roles.hooks.useAccountRolesList",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [accountRolesListState, setAccountRolesListState] = useState<
    RolesAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: ["metadata.createdAt", "id", "name", "permissions", "level", "metadata.deleted"],
    count: 50,
    page: 0,
  });

  const [accountRoles, setAccountRoles] = useState<{
    totalAccountRoles: number;
    accountRoles: ListAccountRole[];
  }>({
    accountRoles: [],
    totalAccountRoles: 0,
  });

  const fetchAccountRoles = useCallback(
    async ({
      count = accountRolesListState.count,
      page = accountRolesListState.page,
      includeDeleted = accountRolesListState.includeDeleted,
      search = accountRolesListState.search,
    }: NullableAccountsListState = {}) => {
      setAccountRolesListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...accountRolesListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success") {
        setAccountRolesListState((prev) => {
          return {
            ...prev,
            count: count as number,
            page: page as number,
            search: search == null ? undefined : search,
            includeDeleted: includeDeleted == null ? undefined : includeDeleted,
            loading: false,
          };
        });

        setAccountRoles({
          accountRoles: result.accountRoles!.map((role) => ({
            id: role.id.toString(),
            name: role.name ?? "",
            level: role.level ?? 0,
            totalPermissions: role.permissions?.split(",").length ?? 0,
            createdAt: role.metadata
              ? new Date(role.metadata.createdAt ?? Date.now())
              : new Date(),
            deleted: role.metadata!.deleted ?? false,
          })),
          totalAccountRoles: result.totalAccountRoles ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setAccountRolesListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [accountRolesListState, message, t],
  );

  return {
    accountRolesListState,
    accountRoles,
    fetchAccountRoles,
    //setAccountsListState, // expose if you want external control
  };
}
