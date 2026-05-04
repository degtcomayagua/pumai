import api from "./api";
import * as schemas from "../../../../shared/schemas/mcp-servers";

import * as MCPServersAPITypes from "../../../../shared/api/mcp-servers";
import { MCPServer } from "../../../../generated/prisma/client"

interface ListMCPServer {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  authType: string;
  createdAt: Date;
  deleted: boolean;
}

// Hooks
import { useMCPServerList } from "./hooks/useList";
import { useCreateRagDocumentModal } from "./hooks/useCreateDrawer";
// import { useDeleteAccountRoleModal } from "./hooks/useDeleteAccountRoleModal";
// import { useUpdateAccountRoleFormValidation } from "./hooks/useUpdateAccountRoleFormValidation";

// Components
import { MCPServersTable } from "./components/MCPServersTable";
import { CreateRagDocumentDrawer } from "./components/CreateRAGDocumentDrawer";
// import { CreateAccountRoleModal } from "./components/CreateAccountRoleModal";

export type { MCPServer, ListMCPServer, MCPServersAPITypes };
export default {
  api,
  schemas,
  hooks: {
    useMCPServerList,
    useCreateRagDocumentModal,
    // useCreateAccountRoleModal,
    // useDeleteAccountRoleModal,
  },
  components: {
    MCPServersTable,
    CreateRagDocumentDrawer,
    // CreateAccountRoleModal,
  },
};
