import api from "./api";
import * as schemas from "../../../../shared/schemas/rag-documents";

import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents";
import { IRAGDocument } from "../../../../shared/models/rag-document";
import { CampusCode, DocumentCategory } from "../../../../shared/models";

interface ListRAGDocument {
  _id: string;
  title: string;
  category: DocumentCategory;
  authorityLevel: number;
  campuses: CampusCode[];
  effective: {
    from: Date;
    until: Date | null;
  };
  tags: string[];
  createdAt: Date;
  deleted: boolean;
}

// Hooks
import { useRagDocumentsList } from "./hooks/useRagDocumentsList";
import { useCreateRagDocumentModal } from "./hooks/useCreateRagDocument";
// import { useDeleteAccountRoleModal } from "./hooks/useDeleteAccountRoleModal";
// import { useUpdateAccountRoleFormValidation } from "./hooks/useUpdateAccountRoleFormValidation";

// Components
import { RagDocumentsTable } from "./components/DocumentsTable";
import { CreateRagDocumentDrawer } from "./components/CreateRAGDocumentDrawer";
// import { CreateAccountRoleModal } from "./components/CreateAccountRoleModal";

export type { IRAGDocument, ListRAGDocument, RAGDocumentsAPITypes };
export default {
  api,
  schemas,
  hooks: {
    useRagDocumentsList,
    useCreateRagDocumentModal,
    // useCreateAccountRoleModal,
    // useDeleteAccountRoleModal,
  },
  components: {
    RagDocumentsTable,
    CreateRagDocumentDrawer,
    // CreateAccountRoleModal,
  },
};
