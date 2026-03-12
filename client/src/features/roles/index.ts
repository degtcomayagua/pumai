import api from "./api";
import * as schemas from "../../../../../contracts/pumai/schemas/account-roles";

import * as RolesAPITypes from "../../../../../contracts/pumai/api/account-roles";
import { IAccountRole } from "../../../../../contracts/pumai/models/account-role";

// Hooks
import { useAccountRolesList } from "./hooks/useAccountRolesList";
import { useCreateAccountRoleModal } from "./hooks/useCreateAccountRoleModal";
import { useDeleteAccountRoleModal } from "./hooks/useDeleteAccountRoleModal";
import { useUpdateAccountRoleFormValidation } from "./hooks/useUpdateAccountRoleFormValidation";

// Components
import { AccountRolesTable } from "./components/AccountRolesTable";
import { UpdateAccountRoleForm } from "./components/UpdateAccountRoleForm";
import { CreateAccountRoleModal } from "./components/CreateAccountRoleModal";

export type { IAccountRole, RolesAPITypes };
export default {
  api,
  schemas,
  hooks: {
    useAccountRolesList,
    useUpdateAccountRoleFormValidation,
    useCreateAccountRoleModal,
    useDeleteAccountRoleModal,
  },
  components: {
    AccountRolesTable,
    UpdateAccountRoleForm,
    CreateAccountRoleModal,
  },
};
