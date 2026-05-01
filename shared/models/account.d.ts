import { IAccountRole } from "./account-role";
import { IMetadata } from "./metadata";
import { CampusCode } from "./";

export type IAccount = {
  _id: string;
  data: {
    lastLogin: Date;
    role: IAccountRole | string;
    status: "active" | "locked";
    campus: CampusCode
  };
  email: {
    value: string;
    verified: boolean;
    lastChanged: Date;
    verificationToken: string | null;
    verificationTokenExpires: Date | null;
  };
  profile: {
    name: string;
  };
  preferences: {
    security: {
      tfaSecret: string | null;
      password: string;
      forgotPasswordToken: string | null;
      forgotPasswordTokenExpires: Date | null;
      lastPasswordChange: Date;
    };
  };
  metadata: IMetadata;
};
