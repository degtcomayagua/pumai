import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import { App, Button, Input, Modal, Drawer, Typography, Switch } from "antd";
const { Title, Text } = Typography;

import AdminPageLayout from "../../../layouts/Admin";
import {
  FaFile,
  FaPlus,
  FaSave,
  FaTrash,
  FaUsersCog,
  FaUserShield,
} from "react-icons/fa";

import RAGDocumentsFeature, {
  IRAGDocument,
  RAGDocumentsAPITypes,
} from "../../../features/rag-documents";
import { AccountRole } from "../../../features/roles";

export const Route = createFileRoute("/admin/rag-documents/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);

  const navigate = useNavigate();
  const { message } = App.useApp();

  const { t: tPage } = useTranslation(["pages"], {
    keyPrefix: "admin.rag-documents",
  });
  const { t: tCommon } = useTranslation(["common"]);

  // List
  const { ragDocuments, fetchRagDocuments, ragDocumentsListState } =
    RAGDocumentsFeature.hooks.useRagDocumentsList({});

  // Create
  const {
    state: createRagDocumentState,
    setState: setCreateRagDocumentState,
    openModal: openCreateRagDocumentModal,
    closeModal: closeCreateRagDocumentModal,
    createDocument: createRagDocument,
  } = RAGDocumentsFeature.hooks.useCreateRagDocumentModal({
    onSuccess: async () => {
      await fetchRagDocuments({ count: 50, page: 0 });
    },
  });

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
        await fetchRagDocuments({ count: 50, page: 0 });
      })();
    }
  }, [account]);

  return (
    <AdminPageLayout selectedPage="rag-documents">
      <RAGDocumentsFeature.components.CreateRagDocumentDrawer
        setState={setCreateRagDocumentState}
        state={createRagDocumentState}
        onClose={closeCreateRagDocumentModal}
        onCreate={async () => {
          await createRagDocument();
        }}
      />

      <Title className="flex items-center gap-2">
        <FaFile />
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
            openCreateRagDocumentModal();
          }}
          icon={<FaPlus />}
        >
          {tPage("uploadDocument")}
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
            fetchRagDocuments({
              search: {
                query: query.trim(),
                searchIn: ["name"],
              },
              count: 50,
              page: 0,
            });
          }}
          loading={ragDocumentsListState.loading}
          enterButton={tCommon("search")}
          placeholder={tPage("searchPlaceholder")}
        />
      </div>

      {/* Documents List */}
      {account && (
        <RAGDocumentsFeature.components.RagDocumentsTable
          fetchRagDocuments={fetchRagDocuments}
          ragDocuments={ragDocuments}
          ragDocumentsListState={ragDocumentsListState}
          currentAccountPermissions={
            (account.data.role as AccountRole).permissions
          }
          onRestore={(document) => { }}
          onUpdate={async (document) => { }}
          onDelete={(document) => { }}
        />
      )}

      <div className="flex mt-4 gap-2 items-center">
        <Switch
          id="page-show-deleted"
          checked={ragDocumentsListState.includeDeleted}
          onChange={(value) => {
            fetchRagDocuments({
              includeDeleted: value,
            });
          }}
        />

        <label htmlFor="page-show-deleted">{tPage("showDeleted")}</label>
      </div>
    </AdminPageLayout>
  );
}
