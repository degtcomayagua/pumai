import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { ISessionAccount } from "@shared/types/sessions.js";

import { AccountWithRole } from "../types/index.js";

import { Permission } from "@shared/types/permissions.js";

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
      role: {
        ...role,
        // @ts-expect-error - Prisma returns permissions as a comma-separated string, but we want it as an array
        permissions: role.permissions?.split(",").map((perm) => perm.trim()) || [] as unknown as Permission[],
      },
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
