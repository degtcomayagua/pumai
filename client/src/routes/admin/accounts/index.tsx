import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { FaUser, FaTrash, FaPlus, FaSave } from "react-icons/fa";

import AccountsFeature, { AccountAPITypes } from "../../../features/accounts";
import AccountRolesFeature, { IAccountRole } from "../../../features/roles";

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
  const { message } = App.useApp();

  // Translations
  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.accounts",
  });
  const { t: tCommon } = useTranslation(["common"]);

  const { accounts, fetchAccounts, accountsListState } =
    AccountsFeature.hooks.useAccountsList({ message });

  const { accountRoles, fetchAccountRoles } =
    AccountRolesFeature.hooks.useAccountRolesList({});

  // # region Create Account

  const {
    setState: setCreateModalState,
    state: createModalState,
    openModal: openCreateAccountModal,
    closeModal: closeCreateAccountModal,
    createAccount: handleCreateAccount,
  } = AccountsFeature.hooks.useCreateModal({
    onSuccess: () => fetchAccounts({}),
  });

  // Delete
  type DeleteAccountModalState = AccountAPITypes.DeleteRequestBody & {
    isOpen: boolean;
    loading: boolean;
  };
  const defaultDeleteAccountModalState: DeleteAccountModalState = {
    accountId: "",
    isOpen: false,
    loading: false,
  };
  const [deleteAccountState, setDeleteAccountState] =
    useState<DeleteAccountModalState>(defaultDeleteAccountModalState);
  const handleDeleteAccount = async () => {
    setDeleteAccountState((prev) => ({ ...prev, loading: true }));

    const result = await AccountsFeature.api.delete({
      accountId: deleteAccountState.accountId!,
    });

    if (result.status === "success") {
      setDeleteAccountState(defaultDeleteAccountModalState);
      await fetchAccounts({});
      message.success(
        tPage("dashboard:accounts.modals.delete.messages.success"),
      );
    } else if (result.status === "cannot-delete-self") {
      message.error(
        tPage("dashboard:accounts.modals.delete.messages.cannot-delete-self"),
      );
    } else if (result.status === "cannot-delete-due-to-role-level") {
      message.error(
        tPage(
          "dashboard:accounts.modals.delete.messages.cannot-delete-due-to-role-level",
        ),
      );
    } else {
      message.error(`t(error-messages:${result.status})`);
    }

    setDeleteAccountState((prev) => ({ ...prev, loading: false }));
  };

  // Restore account
  const handleRestoreAccount = async (accountId: string) => {
    const result = await AccountsFeature.api.restore({ accountId });
    if (result.status == "success") {
      message.success(
        tPage("dashboard:accounts.modals.restore.messages.success"),
      );
      await fetchAccounts({ count: 50, page: 0 });
    } else {
      message.error(`t(error-messages:${result.status})`);
    }
  };

  // Update
  const {
    onValuesChange: onUpdateAccountValuesChange,
    form: updateAccountForm,
    validate: validateUpdateAccountForm,
    setDefaultValues: setUpdateAccountFormDefaultValues,
    defaultValues: defaultUpdateAccountFields,
  } = AccountsFeature.hooks.useUpdateAccountFormValidation(tPage);

  const resetUpdateAccountModalState = () => {
    setUpdateAccountModalState({ isOpen: false, loading: false });
    updateAccountForm.resetFields();
  };

  const [updateAccountModalState, setUpdateAccountModalState] = useState({
    isOpen: false,
    loading: false,
  });
  const handleUpdateAccount = async () => {
    if (updateAccountModalState.loading) return;

    // Use hook’s validate method — sets form errors internally
    const values = updateAccountForm.getFieldsValue(true);
    if (!validateUpdateAccountForm(values)) {
      return;
    }

    setUpdateAccountModalState((prev) => ({ ...prev, loading: true }));
    const result = await AccountsFeature.api.update(values);

    if (result.status === "success") {
      message.success(
        tPage("dashboard:accounts.modals.update.messages.success"),
      );

      updateAccountForm.resetFields();
      setUpdateAccountModalState({ isOpen: false, loading: false });

      await fetchAccounts({});
    } else {
      setUpdateAccountModalState((prev) => ({ ...prev, loading: false }));
      message.error(tPage(`error-messages:${result.status}`));
    }
  };

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
        state={createModalState}
        setState={setCreateModalState}
        roles={accountRoles.accountRoles}
        onClose={closeCreateAccountModal}
        onCreate={handleCreateAccount}
      />

      {/* This window manages the account deletion */}
      <Modal
        open={deleteAccountState.isOpen}
        onCancel={() => setDeleteAccountState(defaultDeleteAccountModalState)}
        cancelText={tPage("dashboard:common.cancel")}
        okText={tPage("dashboard:accounts.modals.delete.title")}
        okButtonProps={{
          danger: true,
          loading: deleteAccountState.loading,
          icon: <FaTrash />,
        }}
        onOk={handleDeleteAccount}
        title={tPage("dashboard:accounts.modals.delete.title")}
      >
        <p>{tPage("dashboard:accounts.modals.delete.description")}</p>
        <p className="mt-2">{tPage("dashboard:accounts.modals.delete.note")}</p>
      </Modal>

      <Modal
        title={tPage("dashboard:accounts.modals.update.title")}
        open={updateAccountModalState.isOpen}
        onCancel={resetUpdateAccountModalState}
        cancelText={tPage("common.cancel")}
        onOk={handleUpdateAccount}
        okButtonProps={{
          loading: updateAccountModalState.loading,
          icon: <FaSave />,
          disabled: updateAccountModalState.loading,
        }}
        okText={tPage("dashboard:accounts.modals.update.title")}
      >
        <AccountsFeature.components.UpdateAccountForm
          form={updateAccountForm}
          defaultValues={defaultUpdateAccountFields}
          t={tPage}
          roles={accountRoles.accountRoles}
          onValuesChange={onUpdateAccountValuesChange}
        />
      </Modal>

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
            if (!query || query.trim() === "") return;
            await fetchAccounts({
              search: {
                query: query,
                searchIn: ["email.value", "profile.name"],
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
            setDeleteAccountState({
              accountId: acc.id,
              isOpen: true,
              loading: false,
            });
          }}
          onUpdate={(acc) => {
            setUpdateAccountModalState({
              loading: false,
              isOpen: true,
            });
            setUpdateAccountFormDefaultValues({
              roleId: acc.role.id ?? "",
              password: "",
              notify: false,
              name: acc.name,
              email: acc.email,
              disableTwoFactor: false,
              accountId: acc.id,
            });
          }}
          onRestore={(acc) => {
            handleRestoreAccount(acc.id);
          }}
          onChangePassword={(acc) => {
            message.info(tPage("changePasswordNotAvailable"));
          }}
          onUpdateStatus={(acc) => {
            message.info(tPage("updateStatusNotAvailable"));
          }}
          accountPermissions={
            (account?.data.role as IAccountRole).permissions ?? []
          }
          accountLevel={(account?.data.role as IAccountRole).level ?? 0}
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
