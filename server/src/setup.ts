import bcrypt from "bcrypt";
import prismaClient from "./config/prisma.js";
import { createAccountWithRetry } from "./services/accounts/create.js";

/**
 * Bootstraps the system with default admin role and account if none exist.
 */
const setupServer = async () => {
  // Check if system is fresh
  const existingAccounts = await prismaClient.account.count({});

  if (existingAccounts > 0) {
    console.log("[SETUP] System already initialized, skipping bootstrap.");
    return;
  }

  console.log("[SETUP] Fresh system detected, running bootstrap...");

  // 1. Create Admin Role
  let adminRole = await prismaClient.accountRole.findFirst({
    where: { level: -1 },
  });

  if (!adminRole) {
    adminRole = await prismaClient.accountRole.create({
      data: {
        name: "Admin",
        level: -1,
        description: "Administrator role with full permissions",
        isSystemRole: true,
        permissions: "*",
        requiresTwoFactor: true,
        metadata: {
          create: {
            documentVersion: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deleted: false,
            deletedAt: null,
            deletedById: null,
            status: "active",
            source: "manual",
            tags: "",
            notes: "",
          },
        },
      },
    });
    console.log("[SETUP] Created default Admin role");
  } else {
    console.log("[SETUP] Admin role already exists");
  }

  // 2. Create Primary Admin Account
  await createAccountWithRetry(
    {
      campus: "COMAYAGUA",
      roleId: adminRole.id,
      password: "admin123", // Service will hash this password before saving
      name: "Admin User",
      email: "admin@local.test",
    },
    {},
  );

  console.log(
    "[SETUP] Created default admin account (admin@local.test / admin123)",
  );
};

export default setupServer;
