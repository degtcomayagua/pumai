import mongoose from "mongoose";
import { IMetadata } from "../schemas/metadata";

export type ILog = {
	_id: mongoose.Types.ObjectId;
	date: Date;
	source: string;
	level: "info" | "warning" | "error" | "critical" | "debug" | "important";
	message: string;
	duration?: number; // Optional duration in milliseconds
	details?: Record<string, any>;
	traceId?: string; // Optional request ID for tracing requests

	// Optional reference metadata
	_references?: Record<string, string>; // e.g., { accountId: "Account", roleId: "Role" }

	metadata: IMetadata;
};

