import { useState, useCallback, useRef } from "react";
import type { TFunction } from "i18next";
import type { MessageInstance } from "antd/es/message/interface";

import AccountsFeature from "../";
import { useTranslation } from "react-i18next";

interface SearchAccountResult {
  id: string;
  name: string;
}

type UseAccountsListOptions = {
  message?: MessageInstance;
  apiList?: typeof AccountsFeature.api.list;
};

export function useAccountSearch({
  message,
  apiList = AccountsFeature.api.list,
}: UseAccountsListOptions) {
  const { t } = useTranslation(['features'], { keyPrefix: 'accounts.hooks.useAccountSearch' });

  const [accounts, setAccounts] = useState<SearchAccountResult[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAccounts = useCallback(
    (query: string) => {
      if (!query || query.trim() === "") return;
      if (query.length > 100) {
        if (t && message) message.warning(t("messages:query-too-long"));
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await apiList({
            search: { query, searchIn: ["name"] },
            fields: ["name", "id"],
            count: 10,
            page: 0,
          });

          if (result.status === "success") {
            setAccounts(
              (result.accounts ?? []).map((acc) => ({
                id: acc.id.toString(),
                name: acc.name,
              })),
            );

            if ((result.accounts?.length ?? 0) === 0 && message && t) {
              message.info(t("messages:no-results"));
            }
          } else if (message && t) {
            message.error(t(`error-messages:${result.status}`));
          }
        } finally {
          timeoutRef.current = null;
        }
      }, 500);
    },
    [apiList, message, t],
  );

  const resetSearchAccounts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAccounts([]);
  }, []);

  return {
    accounts,
    searchAccounts,
    resetSearchAccounts,
  };
}
