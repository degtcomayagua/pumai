import api from "./api";
import * as schemas from "../../../../shared/schemas/account-roles";

import * as RolesAPITypes from "../../../../shared/api/account-roles";
import { AccountRole } from "@prisma/client";

export interface ListAccountRole {
  id: string;
  name: string;
  level: number;
  totalPermissions: number;
  createdAt: Date;
  deleted: boolean;
}

// Hooks
import { useList } from "./hooks/useList";
import { useCreateModal } from "./hooks/useCreateModal";
import { useUpdateDrawer } from "./hooks/useUpdateDrawer";

// Components
import { AccountRolesTable } from "./components/AccountRolesTable";
import { UpdateDrawer } from "./components/UpdateModal";
import { CreateModal } from "./components/CreateModal";

export type { AccountRole, RolesAPITypes };
export default {
  api,
  schemas,
  hooks: {
    useList,
    useUpdateDrawer,
    useCreateModal,
  },
  components: {
    AccountRolesTable,
    UpdateDrawer,
    CreateModal,
  },
};
