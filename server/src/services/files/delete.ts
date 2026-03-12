import fs from "fs-extra";
import path from "path";
import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import FileModel from "../../models/File";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";
import { IFile } from "../../../../shared/models/file";

type DeleteFileOptions = {
	session?: mongoose.ClientSession;
	traceId?: string;
	terminalId?: mongoose.Types.ObjectId;
	adminAccount?: IAccount;
};

function setFileMetadataSoftDelete(
	file: IFile,
	now: Date,
	adminAccount?: IAccount,
	terminalId?: mongoose.Types.ObjectId,
) {
	file.metadata.deleted = true;
	file.metadata.deletedAt = now;
	file.metadata.deletedByTerminal = terminalId;
	file.metadata.deletedBy = adminAccount?._id;
	file.metadata.updatedAt = now;
	file.metadata.updatedBy = adminAccount?._id;
	file.metadata.updatedByTerminal = terminalId;

	file.metadata.updateHistory ??= [];
	file.metadata.updateHistory.push({
		updatedAt: now,
		updatedBy: adminAccount?._id,
		updatedByTerminal: terminalId,
		changes: {
			deleted: true,
			deletedAt: now,
			deletedByTerminal: terminalId,
			deletedBy: adminAccount?._id,
		},
	});
}

export async function deleteFileHard(
	fileId: string,
	options: DeleteFileOptions = {},
): Promise<IFile> {
	const startTime = performance.now();
	const traceId = options.traceId ?? `deleteFile:${fileId}`;
	const adminAccount = options.adminAccount;

	let session = options.session;
	let sessionCreatedWithinService = false;

	if (!session) {
		session = await mongoose.startSession();
		session.startTransaction();
		sessionCreatedWithinService = true;
	}

	try {
		const file = await FileModel.findById(fileId).session(session);
		if (!file) throw new Error("not-found");

		// Soft-delete + update metadata
		const now = new Date();
		setFileMetadataSoftDelete(file, now, adminAccount, options.terminalId);

		// Remove file from disk
		const uploadsRoot = path.resolve(__dirname, "../../uploads");
		const fullPath = path.join(uploadsRoot, file.folder, file.filePath);
		await fs.remove(fullPath);

		// Log the operation
		LoggingService.log({
			source: "services:files:delete-hard",
			level: "important",
			message: "Admin hard deleted a file",
			traceId,
			duration: Number((performance.now() - startTime).toFixed(3)),
			details: {
				fileId: file._id.toString(),
				deletedBy: adminAccount?._id?.toString(),
				terminalId: options.terminalId,
				fileName: file.fileMetadata.name,
				filePath: file.filePath,
			},
			_references: {
				fileId: "File",
				...(adminAccount ? { deletedBy: "Account" } : {}),
				...(options.terminalId ? { terminalId: "Terminal" } : {}),
			},
		});

		if (sessionCreatedWithinService) {
			await session.commitTransaction();
			session.endSession();
		}

		return file;
	} catch (err) {
		if (sessionCreatedWithinService) {
			await session.abortTransaction();
			session.endSession();
		}
		throw err;
	}
}

export async function deleteFileHardWithRetry(
	fileId: string,
	options: DeleteFileOptions = {},
): Promise<IFile> {
	return retry(
		async (bail, attempt) => {
			const startTime = performance.now();
			try {
				return await deleteFileHard(fileId, options);
			} catch (error: any) {
				if (error.message === "not-found") bail(error);

				LoggingService.log({
					source: "services:files:delete-hard:retry",
					level: "warning",
					traceId: options.traceId ?? `deleteFile:${fileId}`,
					duration: Number((performance.now() - startTime).toFixed(3)),
					message: `Retryable error during file hard delete (attempt ${attempt})`,
					details: { error: error.message, stack: error.stack },
				});

				throw error;
			}
		},
		{
			retries: 3,
			minTimeout: 1000,
			maxTimeout: 5000,
			factor: 2,
		},
	);
}
