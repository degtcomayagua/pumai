import type { Permission } from "../types/permissions";

const permissions: Permission[] = [
  "*",
  "*:*",

  // Files
  "files:upload",
  "files:delete",

  // Logs
  "logs:read",
  "logs:export",
  "logs:print",

  // Reports
  "reports:read",
  "reports:export",
  "reports:print",

  // Accounts
  "accounts:create",
  "accounts:read",
  "accounts:update",
  "accounts:delete",
  "accounts:restore",
  "accounts:change-password",
  "accounts:update-status",

  // Account Roles
  "account-roles:create",
  "account-roles:read",
  "account-roles:update",
  "account-roles:delete",
  "account-roles:restore",

  // config
  "config:update",
  "config:read",
  "config:export",
  "config:import",

  // MCP
  "mcp-servers:create",
  "mcp-servers:read",
  "mcp-servers:update",
  "mcp-servers:delete",
  "mcp-servers:restore",

  // RAG
  "rag-documents:create",
  "rag-documents:read",
  "rag-documents:update",
  "rag-documents:delete",
  "rag-documents:restore",

  // Workflows
  "workflows:create",
  "workflows:read",
  "workflows:update",
  "workflows:delete",
  "workflows:restore",
];

export default permissions;
