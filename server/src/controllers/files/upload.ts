import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import { uploadFileWithRetry } from "../../services/files/upload";

import * as FilesAPITypes from "../../../../shared/types/api/files";

const handler = async (
	req: Request<{}, {}, FilesAPITypes.UploadFileRequestBody>,
	res: Response<FilesAPITypes.UploadFileResponseData>,
	_next: NextFunction,
) => {
	const session = await mongoose.startSession();
	const adminAccount = req.user as IAccount;

	try {
		session.startTransaction();
		const parsedBody = JSON.parse((req.body as any).data || "{}");

		// Multer puts the file in req.file
		if (!req.file || !req.file.buffer) {
			await session.abortTransaction();
			await session.endSession();
			res.status(400).json({ status: "no-file-provided" });
			return;
		}

		const { buffer, originalname } = req.file;
		const folder = parsedBody.folder || "/";

		// Call upload service, which handles uuid naming, saving, metadata etc.
		const file = await uploadFileWithRetry(
			{
				buffer,
				folder,
				originalName: originalname,
			},
			{
				session,
				traceId: req.traceId,
				adminAccount,
				terminalId: req.terminalId,
			},
		);

		await session.commitTransaction();
		await session.endSession();

		res.status(201).json({
			status: "success",
			file,
		});
	} catch (error: any) {
		await session.abortTransaction();
		await session.endSession();

		LoggingService.log({
			source: "api:files:upload",
			level: "error",
			message: "Unexpected error during file upload",
			traceId: req.headers["x-trace-id"] as string | undefined,
			details: {
				error: error?.message,
				stack: error?.stack,
			},
			metadata: {
				createdAt: new Date(),
				createdBy: adminAccount._id,
				createdByTerminal: req.terminalId,
			},
		});

		res.status(500).json({ status: "internal-error" });
	}
};

export default handler;

