import mongoose from "mongoose";

import { IAccountRole } from "../../../shared/models/account-role";
import permissionsArray from "../../../shared/constants/permissions";
import metadataSchema from "./Metadata";

const accountRoleSchema = new mongoose.Schema<IAccountRole>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isSystemRole: { type: Boolean, default: false },
  level: { type: Number, required: true }, // e.g. 0 = admin, 1 = user, etc.
  permissions: { type: [String], enum: permissionsArray, default: [] }, // e.g. ["categories:create", "products:delete"]
  requiresTwoFactor: { type: Boolean, default: false },

  metadata: metadataSchema,
});

const AccountRoleModel = mongoose.model<IAccountRole>(
  "AccountRole",
  accountRoleSchema,
);

export default AccountRoleModel;
