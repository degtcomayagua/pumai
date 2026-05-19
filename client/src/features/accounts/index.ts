import api from "./api";
import * as schemas from "../../../../shared/schemas/accounts";

// Types
import * as AccountAPITypes from "../../../../shared/api/accounts";
import { Account, CampusCode } from "@prisma/client";

type ListAccount = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: {
    id: string;
    name: string;
    level: number;
  };
  campus: CampusCode;
  deleted: boolean;
};

// Hooks
import { useAccountsList } from "./hooks/useAccountsList";
import { useAccountSearch } from "./hooks/useAccountSearch";
import { useCreateModal } from "./hooks/useCreateModal";
import { useUpdatePasswordModal } from "./hooks/useUpdatePassword";
import { useUpdateStatusModal } from "./hooks/useUpdateStatus";
import { useUpdateModal } from "./hooks/useUpdateModal";

// Components
import { CreateAccountModal } from "./components/CreateAccountModal";
import { UpdateModal } from "./components/UpdateModal";
import { AccountsTable } from "./components/AccountsTable";
import { UpdatePasswordModal } from "./components/ChangePasswordModal";
import { UpdateStatusModal } from "./components/UpdateStatusModal";

export type { AccountAPITypes, Account, ListAccount };
export default {
  api,
  schemas,
  hooks: {
    useAccountsList,
    useAccountSearch,
    useCreateModal,
    useUpdateStatusModal,
    useUpdatePasswordModal,
    useUpdateModal,
  },
  components: {
    CreateAccountModal,
    AccountsTable,
    UpdateModal,
    UpdatePasswordModal,
    UpdateStatusModal,
  },
};
