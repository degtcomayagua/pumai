import { useState, useCallback } from 'react'
import type { TFunction } from 'i18next'
import type { MessageInstance } from 'antd/es/message/interface'

import AccountsFeature, { AccountAPITypes, type ListAccount } from '../'
import type { IAccountRole } from '../../roles'

type NullableAccountsListState = {
  [K in keyof AccountAPITypes.ListRequestBody]?:
  | AccountAPITypes.ListRequestBody[K]
  | null
}

type UseAccountsListOptions = {
  t?: TFunction
  message?: MessageInstance
  apiList?: typeof AccountsFeature.api.list
}

export function useAccountsList({
  t,
  message,
  apiList = AccountsFeature.api.list,
}: UseAccountsListOptions) {
  const [accountsListState, setAccountsListState] = useState<
    AccountAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: ['name', 'email', 'campus', 'metadata.createdAt', 'id'],
    populate: ['role'],
    count: 50,
    page: 0,
  })

  const [accounts, setAccounts] = useState<{
    totalAccounts: number
    accounts: ListAccount[]
  }>({
    accounts: [],
    totalAccounts: 0,
  })

  const fetchAccounts = useCallback(
    async ({
      count = accountsListState.count,
      page = accountsListState.page,
      includeDeleted = accountsListState.includeDeleted,
      search = accountsListState.search,
      filters = accountsListState.filters,
    }: NullableAccountsListState = {}) => {
      setAccountsListState((prev) => ({ ...prev, loading: true }))

      const result = await apiList({
        ...accountsListState,
        search: search == null ? undefined : search,
        filters: filters == null ? undefined : filters,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      })

      if (result.status === 'success') {
        setAccountsListState((prev) => {
          return {
            ...prev,
            count: count as number,
            page: page as number,
            search: search == null ? undefined : search,
            filters: filters == null ? undefined : filters,
            includeDeleted: includeDeleted == null ? undefined : includeDeleted,
            loading: false,
          }
        })

        setAccounts({
          accounts: result.accounts!.map((acc) => ({
            id: acc.id,
            name: acc.name,
            email: acc.email,
            role: {
              id: (acc.role).id.toString(),
              name: (acc.role).name,
              level: (acc.role).level,
            },
            createdAt: acc.metadata?.createdAt
              ? new Date(acc.metadata.createdAt)
              : new Date(),
            deleted: acc.metadata?.deleted ?? false,
          })),
          totalAccounts: result.totalAccounts ?? 0,
        })
      } else {
        if (message && t) {
          message.error(t(`error-messages:${result.status}`))
        }
        setAccountsListState((prev) => ({ ...prev, loading: false }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountsListState, message, t],
  )

  return {
    accountsListState,
    accounts,
    fetchAccounts,
    //setAccountsListState, // expose if you want external control
  }
}
