import api from "./api";
import * as schemas from "../../../../../contracts/pumai/schemas/accounts";

// Types
import * as AccountAPITypes from "../../../../../contracts/pumai/api/accounts";
import type { IAccount } from "../../../../../contracts/pumai/models/account";

type ListAccount = {
  _id: string;
  name: string;
  email: string;
  role: {
    _id: string;
    name: string;
    level: number;
  };
  deleted: boolean;
};

// Hooks
import { useAccountsList } from "./hooks/useAccountsList";
import { useAccountSearch } from "./hooks/useAccountSearch";
import { useCreateModal } from "./hooks/useCreateModal";
import { useUpdateAccountFormValidation } from "./hooks/useUpdateAccountFormValidation";

// Components
import { CreateAccountModal } from "./components/CreateAccountModal";
import { UpdateAccountForm } from "./components/UpdateAccountForm";
import { AccountsTable } from "./components/AccountsTable";

export type { AccountAPITypes, IAccount, ListAccount };
export default {
  api,
  schemas,
  hooks: {
    useAccountsList,
    useUpdateAccountFormValidation,
    useAccountSearch,
    useCreateModal,
  },
  components: {
    CreateAccountModal,
    AccountsTable,
    UpdateAccountForm,
  },
};
