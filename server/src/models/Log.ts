import mongoose from "mongoose";
import { ILog } from "../../../shared/models/log";
import metadataSchema from "./Metadata";

const logSchema = new mongoose.Schema<ILog>(
	{
		date: {
			type: Date,
			required: true,
			default: () => new Date(),
			index: true,
		},
		source: {
			type: String,
			required: true,
			index: true,
			trim: true,
		},
		level: {
			type: String,
			enum: ["info", "warning", "error", "critical", "debug", "important"],
			required: true,
			index: true,
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		details: {
			type: Map,
			of: mongoose.Schema.Types.Mixed,
			default: {},
		},
		traceId: {
			type: String,
			index: true,
			trim: true,
			default: null,
		},
		// How much time the operation took
		duration: {
			type: Number,
			default: 0, // in milliseconds
			index: true,
		},
		_references: {
			type: Map,
			of: String, // maps keys in `details` to model names
			default: {},
		},
		metadata: metadataSchema,
	},
	{
		versionKey: false, // removes __v
	},
);

const LogModel = mongoose.model<ILog>("Log", logSchema);
export default LogModel;

