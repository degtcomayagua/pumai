import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import { App, Button, Input, Modal, Drawer, Typography, Switch } from "antd";
const { Title, Text } = Typography;

import AdminPageLayout from "../../../layouts/Admin";
import {
  FaPlus,
  FaSave,
  FaTrash,
  FaUsersCog,
  FaUserShield,
} from "react-icons/fa";

import AccountRolesFeature, {
  AccountRole,
  RolesAPITypes,
} from "../../../features/roles";

export const Route = createFileRoute("/admin/accounts/roles")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.account-roles",
  });
  const { t: tCommon } = useTranslation(["common"]);

  const { accountRoles, fetchAccountRoles, accountRolesListState } =
    AccountRolesFeature.hooks.useAccountRolesList({});

  // Create Role
  const {
    openModal: openCreateAccountRoleModal,
    closeModal: closeCreateAccountRoleModal,
    setState: setCreateAccountRoleModalState,
    state: createAccountRoleModalState,
    createAccount: handleCreateAccountRole,
  } = AccountRolesFeature.hooks.useCreateAccountRoleModal({
    onSuccess: async () => {
      await fetchAccountRoles({});
    },
  });

  // Delete Role
  const { t: tDeleteModal } = useTranslation(["features"], {
    keyPrefix: "account-roles.components.deleteModal",
  });
  const {
    openModal: openDeleteAccountRoleModal,
    closeModal: closeDeleteAccountRoleModal,
    state: deleteAccountRoleModalState,
    deleteAccount: handleDeleteAccountRole,
  } = AccountRolesFeature.hooks.useDeleteAccountRoleModal({
    onSuccess: async () => {
      await fetchAccountRoles({});
    },
  });

  //#region Restore a role
  const handleRestoreAccountRole = async (accId: string) => {
    if (!accId) return;
    const result = await AccountRolesFeature.api.restore({
      roleId: accId,
    });

    if (result.status == "success") {
      message.success(tPage("dashboard:roles.modals.restore.messages.success"));
      fetchAccountRoles({ count: 50, page: 0 });
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
  //#endregion

  // #region Update a role
  const {
    form: updateAccountRoleForm,
    validate: updateAccountRoleValidation,
    defaultValues: updateAccountRoleDefaultValues,
    onValuesChange: updateAccountRoleOnvaluesChange,
  } = AccountRolesFeature.hooks.useUpdateAccountRoleFormValidation(tPage);

  const loadUpdateAccountRole = async (roleId: string) => {
    if (!roleId) return;
    const result = await AccountRolesFeature.api.get({
      roleIds: [roleId],
    });
    if (result.status === "success") {
      const role = result.accountRoles![0];
      if (role) {
        updateAccountRoleForm.setFieldsValue({
          permissions: role.permissions,
          roleId: role._id.toString(),
          description: role.description,
          level: role.level,
          name: role.name,
          requiresTwoFactor: role.requiresTwoFactor,
        });
      }
    } else {
      message.error(tPage(`error-messages:${result.status}`));
    }
  };

  const [updateAccountRoleModalState, setUpdateAccountRoleModalState] =
    useState<{
      isOpen: boolean;
      loading: boolean;
    }>({
      isOpen: false,
      loading: false,
    });
  const resetUpdateAccountModalState = () => {
    setUpdateAccountRoleModalState({ isOpen: false, loading: false });
    updateAccountRoleForm.resetFields();
  };

  const handleAccountRoleUpdate = async () => {
    if (updateAccountRoleModalState.loading) return;

    // Use hook’s validate method — sets form errors internally
    const values = updateAccountRoleForm.getFieldsValue(true);
    if (!updateAccountRoleValidation(values)) {
      return;
    }

    setUpdateAccountRoleModalState((prev) => ({ ...prev, loading: true }));
    const result = await AccountRolesFeature.api.update(values);

    if (result.status === "success") {
      message.success(tPage("dashboard:roles.modals.update.messages.success"));

      updateAccountRoleForm.resetFields();
      setUpdateAccountRoleModalState({ isOpen: false, loading: false });

      await fetchAccountRoles({});
    } else if (result.status === "level-in-use") {
      setCreateAccountRoleModalState((prev) => ({ ...prev, loading: false }));
      message.error(
        tPage("dashboard:roles.modals.create.messages.level-in-use"),
      );
    } else if (result.status === "level-too-high") {
      setCreateAccountRoleModalState((prev) => ({ ...prev, loading: false }));
      message.error(
        tPage("dashboard:roles.modals.create.messages.level-too-high"),
      );
    } else {
      setUpdateAccountRoleModalState((prev) => ({ ...prev, loading: false }));
      message.error(tPage(`error-messages:${result.status}`));
    }
  };
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
      <AccountRolesFeature.components.CreateAccountRoleModal
        onClose={closeCreateAccountRoleModal}
        onCreate={handleCreateAccountRole}
        state={createAccountRoleModalState}
        setState={setCreateAccountRoleModalState}
      />

      {/* Update Role */}
      <Drawer
        title={tPage("dashboard:roles.modals.update.title")}
        open={updateAccountRoleModalState.isOpen}
        onClose={resetUpdateAccountModalState}
        width={1000}
        extra={
          <Button
            icon={<FaSave />}
            type="primary"
            loading={updateAccountRoleModalState.loading}
            onClick={handleAccountRoleUpdate}
          >
            {tPage("dashboard:common.save")}
          </Button>
        }
      >
        <AccountRolesFeature.components.UpdateAccountRoleForm
          form={updateAccountRoleForm}
          defaultValues={updateAccountRoleDefaultValues}
          onValuesChange={updateAccountRoleOnvaluesChange}
        />
      </Drawer>

      {/* Delete Role */}
      <Modal
        title={tDeleteModal("title")}
        open={deleteAccountRoleModalState.isOpen}
        onOk={handleDeleteAccountRole}
        okButtonProps={{
          icon: <FaTrash />,
          loading: deleteAccountRoleModalState.loading,
          danger: true,
        }}
        okText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        onCancel={closeDeleteAccountRoleModal}
      >
        <p>{tDeleteModal("description")}</p>
      </Modal>

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
            if (!query || query.trim() === "") return;
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
          accountPermissions={(account.data.role as AccountRole).permissions}
          onRestore={(accRole) => {
            handleRestoreAccountRole(accRole._id);
          }}
          onUpdate={async (acc) => {
            if (acc.level === -1) {
              return message.warning(
                "No puedes editar el rol de administrador.",
              );
            }
            setUpdateAccountRoleModalState({
              isOpen: true,
              loading: false,
            });
            await loadUpdateAccountRole(acc._id);
          }}
          onDelete={(accRole) => {
            openDeleteAccountRoleModal(accRole._id);
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
