import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { IAccount } from "../../../shared/models/account";
import { ISessionAccount } from "../../../shared/types/sessions";

import AccountRoleModel from "../models/AccountRole";

const verifyPassword = (passwordHash: string, password: string): boolean => {
  return bcrypt.compareSync(password, passwordHash);
};

const verifyTFA = (tfaSecret: string, tfaCode: string): boolean => {
  return speakeasy.totp.verify({
    secret: tfaSecret,
    encoding: "base32",
    token: tfaCode,
  });
};

const createSessionAccount = async (
  account: IAccount,
): Promise<ISessionAccount> => {
  const role = await AccountRoleModel.findById(account.data.role);
  if (!role) {
    throw new Error("Role not found");
  }

  return {
    _id: account._id.toString(),
    profile: account.profile,
    email: {
      value: account.email.value,
      verified: account.email.verified,
    },
    data: {
      role,
      status: account.data.status,
    },
    preferences: {
      security: {
        twoFactorEnabled: account.preferences.security.tfaSecret !== null,
      },
    },
  };
};

export default {
  verifyPassword,
  verifyTFA,
  createSessionAccount,
};
