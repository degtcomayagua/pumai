import api from "./api";
import * as schemas from "../../../../shared/schemas/workflows";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows";
import { Workflow } from "../../../../generated/prisma/client"

interface ListWorkflow {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  authType: string;
  createdAt: Date;
  deleted: boolean;
}

// Hooks
import { useWorkflowsList } from "./hooks/useList";
import { useCreateWorkflowModal } from "./hooks/useCreateDrawer";
// import { useDeleteAccountRoleModal } from "./hooks/useDeleteAccountRoleModal";
// import { useUpdateAccountRoleFormValidation } from "./hooks/useUpdateAccountRoleFormValidation";

// Components
import { WorkflowsTable } from "./components/WorkflowsTable";
import { CreateWorkflowsDrawer } from "./components/CreateWorkflowDrawer";
// import { CreateAccountRoleModal } from "./components/CreateAccountRoleModal";

export type { Workflow, ListWorkflow, WorkflowsAPITypes };
export default {
  api,
  schemas,
  hooks: {
    useWorkflowsList,
    useCreateWorkflowModal,
  },
  components: {
    WorkflowsTable,
    CreateWorkflowsDrawer,
  },
};
