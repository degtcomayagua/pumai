import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import { FaUser, FaPlus } from "react-icons/fa";

import AccountsFeature from "../../../features/accounts";
import AccountRolesFeature from "../../../features/roles";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import { App, Button, Input, Modal, Switch, Typography } from "antd";
const { Text, Title } = Typography;

import AdminPageLayout from "../../../layouts/Admin";

export const Route = createFileRoute("/admin/accounts/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  // Translations
  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.accounts",
  });
  const { t: tCommon } = useTranslation(["common"]);

  const { accounts, fetchAccounts, accountsListState } =
    AccountsFeature.hooks.useAccountsList({});

  const { accountRoles, fetchAccountRoles } =
    AccountRolesFeature.hooks.useList({});

  //#region Create Account
  const {
    setState: setCreateModalState,
    state: createModalState,
    openModal: openCreateAccountModal,
    closeModal: closeCreateAccountModal,
    createAccount: handleCreateAccount,
  } = AccountsFeature.hooks.useCreateModal({
    onSuccess: () => fetchAccounts({}),
  });
  //#endregion

  //#region Update Password
  const {
    setState: setUpdatePasswordModalState,
    closeModal: closeUpdatePasswordModal,
    updatePassword: handleUpdatePassword,
    state: updatePasswordModalState,
    openModal: openUpdatePasswordModal,
  } = AccountsFeature.hooks.useUpdatePasswordModal({
    onSuccess: () => fetchAccounts({}),
  });
  //#endregion

  //#region Update State 
  const {
    setState: setUpdateStatusModalState,
    closeModal: closeUpdateStatusModal,
    updateStatus: handleUpdateStatus,
    state: updateStatusModalState,
    openModal: openUpdateStatusModal,
  } = AccountsFeature.hooks.useUpdateStatusModal({
    onSuccess: () => fetchAccounts({}),
  });
  //#endregion

  //#region Update Account
  const {
    setState: setUpdateModalState,
    reset: closeUpdateModal,
    update: handleUpdateAccount,
    state: updateModalState,
    openModal: openUpdateModal,
  } = AccountsFeature.hooks.useUpdateModal({
    onSuccess: () => fetchAccounts({}),
  });
  //#endregion

  //#region Delete Account
  const handleDeleteAccount = async (accountId: string) => {
    const result = await AccountsFeature.api.delete({
      accountId,
    });

    if (result.status === "success") {
      message.success(tPage("messages.delete.success"));
      await fetchAccounts({});
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
  //#endregion

  //#region Restore account
  const handleRestoreAccount = async (accountId: string) => {
    const result = await AccountsFeature.api.restore({
      accountId,
    });

    if (result.status === "success") {
      message.success(tPage("messages.restore.success"));
      await fetchAccounts({});
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
  //#endregion

  useEffect(() => {
    if (!account) return; // Admin layout will handle this
    if (
      !account.data.role.permissions.includes("accounts:read") &&
      !account.data.role.permissions.includes("*")
    ) {
      message.error(tPage("error-messages:forbidden"));
      navigate({ to: "/admin" });
      return;
    } else {
      (async () => {
        await fetchAccounts({ count: 50, page: 0 });
        await fetchAccountRoles({ count: 50, page: 0 });
      })();
    }
  }, [account]);

  return (
    <AdminPageLayout selectedPage="accounts">
      <AccountsFeature.components.CreateAccountModal
        onClose={closeCreateAccountModal}
        onCreate={handleCreateAccount}
        state={createModalState}
        setState={setCreateModalState}
        roles={accountRoles.accountRoles}
      />

      <AccountsFeature.components.UpdatePasswordModal
        onClose={closeUpdatePasswordModal}
        onUpdatePassword={handleUpdatePassword}
        state={updatePasswordModalState}
        setState={setUpdatePasswordModalState}
      />

      <AccountsFeature.components.UpdateStatusModal
        onClose={closeUpdateStatusModal}
        onUpdateStatus={handleUpdateStatus}
        state={updateStatusModalState}
        setState={setUpdateStatusModalState}
      />

      <AccountsFeature.components.UpdateModal
        onClose={closeUpdateModal}
        onUpdate={handleUpdateAccount}
        state={updateModalState}
        setState={setUpdateModalState}
        accountRoles={accountRoles.accountRoles}
      />

      <div className="mb-2">
        {tCommon("loggedInAs", {
          name: account?.profile.name,
          email: account?.email.value,
        })}
      </div>
      <Title className="flex items-center gap-2">
        <FaUser />
        {tPage("title")}
      </Title>
      <Text>{tPage("description")}</Text>

      <div className="my-2 flex gap-2">
        <Button
          variant="solid"
          type="primary"
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={openCreateAccountModal}
          icon={<FaPlus />}
          disabled={
            !account ||
            !(
              account?.data.role.permissions.includes("*") ||
              account?.data.role.permissions.includes("accounts:create")
            )
          }
        >
          {tPage("createAccount")}
        </Button>
      </div>
      {/* Search */}
      <section>
        <Input.Search
          type="text"
          variant="outlined"
          allowClear
          onClear={async () => {
            await fetchAccounts({
              page: 0,
              search: null,
            });
          }}
          onSearch={async (query) => {
            await fetchAccounts({
              search: {
                query: query,
                searchIn: ["email", "name"],
              },
              page: 0,
            });
          }}
          loading={accountsListState.loading}
          enterButton={tCommon("search")}
          placeholder={tPage("searchPlaceholder")}
        />
      </section>
      {account && (
        <AccountsFeature.components.AccountsTable
          accountsListState={accountsListState}
          fetchAccounts={fetchAccounts}
          accounts={accounts}
          onDelete={(acc) => {
            modal.confirm({
              title: tPage("modals.delete.title"),
              content: tPage("modals.delete.content", { name: acc.name }),
              okText: tCommon("yes"),
              cancelText: tCommon("no"),
              onOk: () => {
                handleDeleteAccount(acc.id);
              },
            });
          }}
          onUpdate={(acc) => {
            openUpdateModal(acc.id);
          }}
          onRestore={(acc) => {
            modal.confirm({
              title: tPage("modals.restore.title"),
              content: tPage("modals.restore.content", { name: acc.name }),
              okText: tCommon("yes"),
              cancelText: tCommon("no"),
              onOk: () => {
                handleRestoreAccount(acc.id);
              },
            });
          }}
          onChangePassword={(acc) => {
            openUpdatePasswordModal(acc.id);
          }}
          onUpdateStatus={(acc) => {
            openUpdateStatusModal(acc.id);
          }}
          accountRoles={accountRoles.accountRoles}
        />
      )}

      <div className="flex mt-4 gap-2 items-center">
        <Switch
          id="page-show-deleted"
          checked={accountsListState.includeDeleted}
          onChange={(value) => {
            fetchAccounts({
              includeDeleted: value,
            });
          }}
        />

        <label htmlFor="page-show-deleted">{tPage("showDeleted")}</label>
      </div>
    </AdminPageLayout>
  );
}
