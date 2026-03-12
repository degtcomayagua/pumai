import { IAccount } from "../models/account";
// import { ITerminal } from "../models/terminal";

export type IMetadata = {
  documentVersion?: number; // Version of the document schema
  syncVersion?: number; // Version for synchronization purposes

  createdAt?: Date;
  createdBy?: string | IAccount; // Reference to Account
  // createdByTerminal?: mongoose.Types.ObjectId | ITerminal;

  updatedAt?: Date;
  updatedBy?: string | IAccount; // Reference to Account
  // updatedByTerminal?: mongoose.Types.ObjectId | ITerminal;
  updateHistory?: {
    updatedAt: Date;
    updatedBy?: string | IAccount; // Reference to Account
    changes: Record<string, any>; // Details of the changes made
  }[];

  deleted?: boolean; // Soft delete flag
  deletedAt?: Date; // Timestamp for soft delete
  deletedBy?: string | IAccount; // Reference to Account who deleted

  status?: "active" | "inactive"; // Status

  source?: "manual" | "imported"; // Source of the  data
  notes?: string; // Additional notes or comments
  tags?: string[]; // Array of tags for categorization
};
