import { AccountRole } from "../../generated/prisma/client.js";
import { Permission } from "../types/permissions.js"

export type ISessionAccount = {
  _id: string;
  profile: {
    name: string;
  };
  email: {
    value: string;
    verified: boolean;
  };
  data: {
    role: Omit<AccountRole, 'permissions'> & {
      permissions: Permission[]
    }
    status: "active" | "inactive";
  };
  preferences: {
    security: {
      twoFactorEnabled: boolean;
    };
  };
};
