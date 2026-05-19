import { useState, useCallback } from "react";

import AccountsFeature, { AccountAPITypes, type ListAccount } from "../";
import { useTranslation } from "react-i18next";
import { App } from "antd";

export type NullableAccountsListState = {
  [K in keyof AccountAPITypes.ListRequestBody]?:
    | AccountAPITypes.ListRequestBody[K]
    | null;
};
export type FetchAccountsFn = (
  params?: NullableAccountsListState,
) => Promise<void>;

type UseAccountsListOptions = {
  apiList?: typeof AccountsFeature.api.list;
};

export function useAccountsList({
  apiList = AccountsFeature.api.list,
}: UseAccountsListOptions) {
  const { message } = App.useApp();
  const { t } = useTranslation(["features"], {
    keyPrefix: "accounts.hooks.useList",
  });

  const [accountsListState, setAccountsListState] = useState<
    AccountAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: [
      "name",
      "email",
      "campus",
      "role",
      "id",
      "status",
      "metadata.deleted",
    ],
    populate: ["role"],
    count: 50,
    page: 0,
  });

  const [accounts, setAccounts] = useState<{
    totalAccounts: number;
    accounts: ListAccount[];
  }>({
    accounts: [],
    totalAccounts: 0,
  });

  const fetchAccounts = useCallback(
    async ({
      count = accountsListState.count,
      page = accountsListState.page,
      includeDeleted = accountsListState.includeDeleted,
      search = accountsListState.search,
      filters = accountsListState.filters,
    }: NullableAccountsListState = {}) => {
      setAccountsListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...accountsListState,
        search: search == null ? undefined : search,
        filters: filters == null ? undefined : filters,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success") {
        setAccountsListState((prev) => {
          return {
            ...prev,
            count: count as number,
            page: page as number,
            search: search == null ? undefined : search,
            filters: filters == null ? undefined : filters,
            includeDeleted: includeDeleted == null ? undefined : includeDeleted,
            loading: false,
          };
        });

        setAccounts({
          accounts: result.accounts!.map((acc) => ({
            id: acc.id.toString(),
            name: acc.name,
            email: acc.email,
            role: {
              id: acc.roleId,
              name: acc.role!.name,
              level: acc.role!.level,
            },
            campus: acc.campus,
            status: acc.status,
            createdAt: acc.metadata
              ? (acc.metadata!.createdAt ?? new Date())
              : new Date(),
            deleted: acc.metadata ? (acc.metadata!.deleted ?? false) : false,
          })),
          totalAccounts: result.totalAccounts ?? 0,
        });
      } else {
        if (message && t) {
          message.error(t(`error-messages:${result.status}`));
        }
        setAccountsListState((prev) => ({ ...prev, loading: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountsListState, message, t],
  );

  return {
    accountsListState,
    accounts,
    fetchAccounts,
    //setAccountsListState, // expose if you want external control
  };
}
