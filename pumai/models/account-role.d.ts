import { IMetadata } from "../types/metadata";
import { Permission } from "../types/permissions";

export type IAccountRole = {
  _id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  level: number; // e.g. 0 = admin, 1 = user, etc.
  permissions: Permission[]; // e.g. ["categories:create", "products:delete"]
  requiresTwoFactor: boolean;

  metadata: IMetadata;
};
