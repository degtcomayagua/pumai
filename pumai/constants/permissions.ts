import type { Permission } from "../types/permissions";

const permissions: Permission[] = [
  "*",
  "*:*",

  // BI
  "bi:read",

  // Products
  "products:create",
  "products:read",
  "products:update",
  "products:delete",
  "products:restore",
  "products:manage-variants",

  // Categories
  "categories:create",
  "categories:read",
  "categories:update",
  "categories:delete",
  "categories:restore",

  // Stores
  "stores:create",
  "stores:read",
  "stores:update",
  "stores:delete",
  "stores:restore",

  // Warehouses
  "warehouses:create",
  "warehouses:read",
  "warehouses:update",
  "warehouses:delete",
  "warehouses:restore",

  // Stock
  "stock:create",
  "stock:read",
  "stock:update",

  // Stock Batches
  "stock-batches:create",
  "stock-batches:read",
  "stock-batches:update",
  "stock-batches:delete",
  "stock-batches:restore",
  "stock-batches:break-down",

  // Promos
  "promos:create",
  "promos:read",
  "promos:update-workflow",
  "promos:update",
  "promos:delete",
  "promos:restore",

  // Costs
  "costs:update-workflow",
  "costs:create",
  "costs:read",
  "costs:update",
  "costs:delete",
  "costs:restore",

  // Files
  "files:upload",
  "files:delete",

  // Logs
  "logs:read",
  "logs:export",
  "logs:print",

  // Stock transactions
  "stock-transactions:read",
  "stock-transactions:export-to-excel",

  // Stock transfers
  "stock-transfers:create",
  "stock-transfers:read",
  "stock-transfers:update",
  "stock-transfers:delete",
  "stock-transfers:restore",
  "stock-transfers:export-to-excel",
  "stock-transfers:void",
  "stock-transfers:convert-to-inventory",
  "stock-transfers:update-payments",
  "stock-transfers:update-workflow",
  "stock-transfers:print-manifesto",

  // POS Sessions
  "pos-sessions:create",
  "pos-sessions:read",
  "pos-sessions:update",
  "pos-sessions:delete",
  "pos-sessions:restore",
  "pos-sessions:set-status",
  "pos-sessions:reconcile",

  // Sales
  "sales:create",
  "sales:read",
  "sales:update",
  "sales:delete",
  "sales:restore",
  "sales:void",
  "sales:discount",
  "sales:update-payments",
  "sales:print-receipt",
  "sales:update-workflow",
  "sales:export-to-excel",

  // refunds
  "refunds:create",
  "refunds:read",
  "refunds:update",
  "refunds:delete",
  "refunds:restore",
  "refunds:export-to-excel",
  "refunds:void",
  "refunds:convert-to-inventory",
  "refunds:update-payments",
  "refunds:update-workflow",
  "refunds:print-receipt",

  // Purchases
  "purchases:create",
  "purchases:read",
  "purchases:update",
  "purchases:delete",
  "purchases:restore",
  "purchases:void",
  "purchases:update-workflow",
  "purchases:update-payments",
  "purchases:convert-to-inventory",
  "purchases:return",

  // Suppliers
  "suppliers:create",
  "suppliers:read",
  "suppliers:update",
  "suppliers:delete",
  "suppliers:restore",

  // CAI
  "cai:create",
  "cai:read",
  "cai:update",
  "cai:delete",
  "cai:restore",

  // Customers
  "customers:create",
  "customers:read",
  "customers:update",
  "customers:delete",
  "customers:restore",
  "customers:export-to-excel",

  // Reports
  "reports:read",
  "reports:export",
  "reports:print",

  // Transactions
  "transactions:read",
  "transactions:export-to-excel",

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

  // Profile
  "profile:update",

  // Terminals
  "terminals:create",
  "terminals:read",
  "terminals:update",
  "terminals:delete",
  "terminals:restore",
  "terminals:manage-keys",
  "terminals:update-cais",
];

export default permissions;
