import mongoose from "mongoose";

import { IAccount } from "../../../shared/models/account";
import metadataSchema from "./Metadata";

const accountSchema = new mongoose.Schema<IAccount>({
  data: {
    lastLogin: { type: Date, default: () => new Date() },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountRole",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "locked"],
      default: "active",
    },
  },
  email: {
    value: { type: String, required: true, unique: true },
    verified: { type: Boolean, default: false },
    lastChanged: { type: Date, default: () => new Date() },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
  },
  profile: {
    name: { type: String, required: true },
    avatarUrl: { type: String, default: null },
  },
  preferences: {
    security: {
      tfaSecret: {
        type: String,
        default: null,
      },
      password: { type: String, required: true },
      forgotPasswordToken: { type: String, default: null },
      forgotPasswordTokenExpires: { type: Date, default: null },
      lastPasswordChange: { type: Date, default: () => new Date() },
    },
  },
  metadata: metadataSchema,
});

const AccountsModel = mongoose.model<IAccount>("Account", accountSchema);
export default AccountsModel;
