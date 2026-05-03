import api from "./api";
import * as schemas from "../../../../shared/schemas/account-roles";

import * as RolesAPITypes from "../../../../shared/api/account-roles";
import { AccountRole } from "../../../../generated/prisma/client"

// Hooks
import { useAccountRolesList } from "./hooks/useAccountRolesList";
import { useCreateAccountRoleModal } from "./hooks/useCreateAccountRoleModal";
import { useDeleteAccountRoleModal } from "./hooks/useDeleteAccountRoleModal";
import { useUpdateAccountRoleFormValidation } from "./hooks/useUpdateAccountRoleFormValidation";

// Components
import { AccountRolesTable } from "./components/AccountRolesTable";
import { UpdateAccountRoleForm } from "./components/UpdateAccountRoleForm";
import { CreateAccountRoleModal } from "./components/CreateAccountRoleModal";

export type { AccountRole, RolesAPITypes };
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
