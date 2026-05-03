import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { IAccount } from "../../../shared/models/account";
import { ISessionAccount } from "../../../shared/types/sessions";

import AccountRoleModel from "../models/AccountRole";

import { Account } from "../../../generated/prisma/client";
import { AccountWithRole } from "../types";

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
  account: AccountWithRole,
): Promise<ISessionAccount> => {
  const role = account.role!;

  return {
    _id: account.id.toString(),
    profile: {
      name: account.name,
    },
    email: {
      value: account.email,
      verified: account.emailVerified,
    },
    data: {
      role,
      status: account.status,
    },
    preferences: {
      security: {
        twoFactorEnabled: account.tfaSecret ? true : false,
      },
    },
  };
};

export default {
  verifyPassword,
  verifyTFA,
  createSessionAccount,
};
