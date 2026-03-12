import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import { IAccount } from "../../../../shared/models/account";

import LoggingService from "../../services/logging";
import { deleteFileHardWithRetry } from "../../services/files/delete";

import * as FilesAPITypes from "../../../../shared/types/api/files";

const handler = async (
	req: Request<{}, {}, FilesAPITypes.DeleteFileRequestBody>,
	res: Response<FilesAPITypes.DeleteFileResponseData>,
	_next: NextFunction,
) => {
	const session = await mongoose.startSession();
	const adminAccount = req.user as IAccount;
	const { fileId } = req.body;

	try {
		session.startTransaction();

		// Call the delete service, which handles the deletion logic
		const file = await deleteFileHardWithRetry(fileId, {
			session,
			traceId: req.traceId,
			terminalId: req.terminalId,
			adminAccount,
		});

		await session.commitTransaction();

		res.status(201).json({
			status: "success",
			file,
		});
	} catch (error: any) {
		await session.abortTransaction();

		LoggingService.log({
			source: "api:files:upload",
			level: "error",
			message: "Unexpected error during file upload",
			traceId: req.traceId,
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
	} finally {
		await session.endSession();
	}
};

export default handler;

