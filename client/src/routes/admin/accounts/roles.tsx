import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import { App, Button, Input, Typography, Switch } from "antd";
const { Title, Text } = Typography;

import AdminPageLayout from "../../../layouts/Admin";
import { FaPlus, FaUserShield } from "react-icons/fa";

import AccountRolesFeature from "../../../features/roles";

export const Route = createFileRoute("/admin/accounts/roles")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.account-roles",
  });
  const { t: tCommon } = useTranslation(["common"]);

  const { accountRoles, fetchAccountRoles, accountRolesListState } =
    AccountRolesFeature.hooks.useList({});

  //#region Create Role
  const {
    openModal: openCreateAccountRoleModal,
    closeModal: closeCreateAccountRoleModal,
    setState: setCreateAccountRoleModalState,
    state: createAccountRoleModalState,
    createAccount: handleCreateAccountRole,
  } = AccountRolesFeature.hooks.useCreateModal({
    onSuccess: async () => {
      await fetchAccountRoles({});
    },
  });
  //#endregion

  //#region Delete Role
  const handleDeleteAccountRole = async (accId: string) => {
    if (!accId) return;
    const result = await AccountRolesFeature.api.delete({
      roleId: accId,
    });

    if (result.status == "success") {
      message.success(tPage("messages.delete.success"));
      fetchAccountRoles({ count: 50, page: 0 });
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
  //#endregion

  //#region Restore a role
  const handleRestoreAccountRole = async (accId: string) => {
    if (!accId) return;
    const result = await AccountRolesFeature.api.restore({
      roleId: accId,
    });

    if (result.status == "success") {
      message.success(tPage("messages.restore.success"));
      fetchAccountRoles({ count: 50, page: 0 });
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
  //#endregion

  // #region Update a role
  const {
    state: updateAccountRoleState,
    setState: setUpdateAccountRoleState,
    openDrawer: openUpdateAccountRoleDrawer,
    update: handleUpdateAccountRole,
    reset: closeUpdateAccountRoleDrawer,
  } = AccountRolesFeature.hooks.useUpdateDrawer({
    onSuccess: async () => {
      await fetchAccountRoles({});
    },
  });
  //#endregion

  useEffect(() => {
    if (!account) return; // Admin layout will handle this
    if (
      !account.data.role.permissions.includes("account-roles:read") &&
      !account.data.role.permissions.includes("*")
    ) {
      message.error(tPage("error-messages:forbidden"));
      navigate({ to: "/admin" });
      return;
    } else {
      (async () => {
        await fetchAccountRoles({ count: 50, page: 0 });
      })();
    }
  }, [account]);

  return (
    <AdminPageLayout selectedPage="account-roles">
      {/* Create Role */}
      <AccountRolesFeature.components.CreateModal
        onClose={closeCreateAccountRoleModal}
        onCreate={handleCreateAccountRole}
        state={createAccountRoleModalState}
        setState={setCreateAccountRoleModalState}
      />

      <AccountRolesFeature.components.UpdateDrawer
        state={updateAccountRoleState}
        setState={setUpdateAccountRoleState}
        onClose={closeUpdateAccountRoleDrawer}
        onUpdate={handleUpdateAccountRole}
      />

      <div className="mb-2">
        {tCommon("loggedInAs", {
          name: account?.profile.name,
          email: account?.email.value,
        })}
      </div>

      <Title className="flex items-center gap-2">
        <FaUserShield />
        {tPage("title")}
      </Title>

      <Text>{tPage("description")}</Text>

      <div className="my-2 flex items-center gap-2">
        <Button
          variant="solid"
          type="primary"
          disabled={
            !account ||
            !(
              account?.data.role.permissions.includes("*") ||
              account?.data.role.permissions.includes("account-roles:create")
            )
          }
          onClick={() => {
            openCreateAccountRoleModal();
          }}
          icon={<FaPlus />}
        >
          {tPage("createRole")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <Input.Search
          type="text"
          variant="outlined"
          allowClear
          onSearch={(query) => {
            fetchAccountRoles({
              search: {
                query: query.trim(),
                searchIn: ["name"],
              },
              count: 50,
              page: 0,
            });
          }}
          loading={accountRolesListState.loading}
          enterButton={tCommon("search")}
          placeholder={tPage("searchPlaceholder")}
        />
      </div>

      {/* Roles List */}
      {account && (
        <AccountRolesFeature.components.AccountRolesTable
          fetchAccountRoles={fetchAccountRoles}
          accountRoles={accountRoles}
          accountRolesListState={accountRolesListState}
          onRestore={(accRole) => {
            modal.confirm({
              title: tPage("modals.restore.title"),
              content: tPage("modals.restore.content", {
                name: accRole.name,
              }),
              onOk: () => handleRestoreAccountRole(accRole.id),
            });
          }}
          onUpdate={(accRole) => {
            openUpdateAccountRoleDrawer(accRole.id);
          }}
          onDelete={(accRole) => {
            modal.confirm({
              title: tPage("modals.delete.title"),
              content: tPage("modals.delete.content", {
                name: accRole.name,
              }),
              onOk: () => handleDeleteAccountRole(accRole.id),
            });
          }}
        />
      )}

      <div className="flex mt-4 gap-2 items-center">
        <Switch
          id="page-show-deleted"
          checked={accountRolesListState.includeDeleted}
          onChange={(value) => {
            fetchAccountRoles({
              includeDeleted: value,
            });
          }}
        />

        <label htmlFor="page-show-deleted">{tPage("showDeleted")}</label>
      </div>
    </AdminPageLayout>
  );
}
