import { IAccountRole } from "../models/account-role";

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
    role: IAccountRole;
    status: "active" | "locked";
  };
  preferences: {
    security: {
      twoFactorEnabled: boolean;
    };
  };
};
