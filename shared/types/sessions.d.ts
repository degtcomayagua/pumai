import { AccountRole } from "../../generated/prisma/client.js";

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
    role: AccountRole;
    status: "active" | "locked";
  };
  preferences: {
    security: {
      twoFactorEnabled: boolean;
    };
  };
};
