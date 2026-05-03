import bcrypt from "bcrypt";

// import AccountsModel from "./models/Account.js";
// import AccountRoleModel from "./models/AccountRole.js";
// import ConfigModel from "./models/Config.js";

const setupServer = async () => {
  // Check if system is fresh
  // const existingAccounts = await AccountsModel.countDocuments({
  //   "metadata.deleted": { $ne: true },
  // });

  // if (existingAccounts > 0) {
  //   console.log("✔ System already initialized, skipping bootstrap.");
  //   return;
  // }

  // console.log("⚡ Fresh system detected, running bootstrap...");

  // // 1. Create Admin Role
  // let adminRole = await AccountRoleModel.findOne({ level: -1, deleted: false });
  // if (!adminRole) {
  //   adminRole = new AccountRoleModel({
  //     name: "Admin",
  //     level: -1,
  //     description: "Administrator role with full permissions",
  //     isSystemRole: true,
  //     permissions: ["*"],
  //     requiresTwoFactor: true,
  //     metadata: {
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //       documentVersion: 1,
  //     },
  //   });
  //   await adminRole.save();
  //   console.log("✔ Created default Admin role");
  // } else {
  //   console.log("✔ Admin role already exists");
  // }

  // // 2. Create Primary Admin Account
  // const hashedPassword = await bcrypt.hash("admin123", 10);
  // const adminAccount = new AccountsModel({
  //   data: {
  //     lastLogin: new Date(),
  //     role: adminRole._id,
  //     status: "active",
  //   },
  //   email: {
  //     value: "admin@local.test",
  //     verified: true,
  //     lastChanged: new Date(),
  //     verificationToken: null,
  //     verificationTokenExpires: null,
  //   },
  //   profile: {
  //     name: "Administrator",
  //   },
  //   preferences: {
  //     security: {
  //       tfaSecret: null,
  //       password: hashedPassword,
  //       forgotPasswordToken: null,
  //       forgotPasswordTokenExpires: null,
  //       lastPasswordChange: new Date(),
  //     },
  //   },
  //   metadata: {
  //     documentVersion: 1,
  //     createdAt: new Date(),
  //     status: "active",
  //     source: "manual",
  //     tags: [],
  //     notes: "",
  //   },
  // });
  // await adminAccount.save();
  // console.log("✔ Created default admin account (admin@local.test / admin123)");

  // // 3. Create Default Config
  // const config = new ConfigModel({});
  // await config.save();
  // console.log("✔ Created default config");
};

export default setupServer;
