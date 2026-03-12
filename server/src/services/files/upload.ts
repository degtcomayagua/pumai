import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import mongoose from "mongoose";
import retry from "async-retry";
import mime from "mime-types";
import { performance } from "perf_hooks";

import FileModel from "../../models/File";
import { IFile } from "../../../../shared/models/file";
import LoggingService from "../../services/logging";
import { IAccount } from "../../../../shared/models/account";

type UploadFileParameters = {
	buffer: Buffer;
	originalName: string; // e.g. "image.png"
	folder: string; // relative folder path, e.g. "docs" or "images"
	sharedWith?: mongoose.Types.ObjectId[]; // accounts who can access
};

type UploadFileOptions = {
	session?: mongoose.ClientSession;
	traceId?: string;
	adminAccount: IAccount;
	terminalId?: mongoose.Types.ObjectId;
};

export class FileExistsError extends Error {
	retryable = false;
	constructor(message: string) {
		super(message);
		this.name = "FileExistsError";
	}
}

const previewableExtensions = [
	".png",
	".jpg",
	".jpeg",
	".gif",
	".bmp",
	".webp",
	".svg",
	".pdf",
	".mp4",
	".webm",
	".ogg",
	".mp3",
	".wav",
	".m4a",
	".txt",
	".html",
	".json",
];

export async function uploadFile(
	params: UploadFileParameters,
	options: UploadFileOptions,
): Promise<IFile> {
	const startTime = performance.now();

	let session = options.session;
	let sessionCreatedHere = false;
	if (!session) {
		session = await mongoose.startSession();
		session.startTransaction();
		sessionCreatedHere = true;
	}

	try {
		const { buffer, originalName, folder, sharedWith = [] } = params;

		// Extract extension and sanitize folder and name
		const ext = path.extname(originalName).toLowerCase();
		const baseName = path
			.basename(originalName, ext)
			.replace(/[^a-z0-9_\-]/gi, "_");
		const cleanFolder = folder.replace(/[^a-z0-9_\-/]/gi, "_");

		const uploadFolderPath = path.resolve("uploads", cleanFolder);
		await fs.ensureDir(uploadFolderPath);

		const fileName = `${uuidv4()}${ext}`;
		const filePath = path.join(uploadFolderPath, fileName);

		await fs.writeFile(filePath, buffer);

		// Calculate hash (optional but good for deduplication)
		const hash = crypto.createHash("sha256").update(buffer).digest("hex");

		// Prepare metadata
		const stats = await fs.stat(filePath);
		const now = new Date();

		const isPreviewable = previewableExtensions.includes(ext.toLowerCase());
		const newFileDoc = new FileModel({
			filePath: path.join(cleanFolder, fileName), // relative path with UUID filename
			sharedWith,
			folder: cleanFolder || "/",
			fileMetadata: {
				name: baseName, // store sanitized original name here
				size: stats.size,
				type: mime.lookup(ext) || "application/octet-stream",
				extension: ext,
				hash,
				isPreviewable,
			},
			metadata: {
				createdAt: now,
				updatedAt: now,
				createdByTerminal: options.terminalId
					? new mongoose.Types.ObjectId(options.terminalId)
					: undefined,
				createdBy: options.adminAccount ? options.adminAccount._id : undefined,
				updatedBy: options.adminAccount ? options.adminAccount._id : undefined,
				updatedByTerminal: options.terminalId
					? new mongoose.Types.ObjectId(options.terminalId)
					: undefined,
				documentVersion: 1,
				updateHistory: [],
			},
		});

		await newFileDoc.save({ session });

		if (sessionCreatedHere) {
			await session.commitTransaction();
			session.endSession();
		}

		LoggingService.log({
			source: "services:files:upload",
			level: "important",
			message: "File uploaded successfully",
			traceId: options.traceId,
			duration: Number((performance.now() - startTime).toFixed(3)),
			details: {
				filePath: newFileDoc.filePath,
				ownerId: options.adminAccount.toString(),
				size: stats.size,
				originalName,
			},
			_references: {
				ownerId: "Account",
			},
		});

		return newFileDoc;
	} catch (error) {
		if (sessionCreatedHere) {
			await session.abortTransaction();
			session.endSession();
		}
		throw error;
	}
}

export async function uploadFileWithRetry(
	params: UploadFileParameters,
	options: UploadFileOptions,
): Promise<IFile> {
	return retry(
		async (bail, attempt) => {
			const startTime = performance.now();
			try {
				return await uploadFile(params, options);
			} catch (error: any) {
				// If you want to bail on non-retryable errors
				if (error instanceof FileExistsError) {
					bail(error);
				}

				LoggingService.log({
					source: "services:files:upload:retry",
					level: "warning",
					traceId: options.traceId,
					duration: Number((performance.now() - startTime).toFixed(3)),
					message: `Retryable error during file upload (attempt ${attempt})`,
					details: {
						error: error.message,
						stack: error.stack,
					},
				});

				throw error; // Retryable
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
