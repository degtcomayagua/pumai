import { z } from "zod";
import { zObjectId } from ".";

const deleteFileSchema = z.object({
	fileId: zObjectId,
});

const uploadFileSchema = z.object({
	folder: z.string().max(255, "folder-name-too-long").optional().default("/"),
	// file itself will be validated by multer, so just validate metadata here:
	originalName: z
		.string()
		.min(1, "originalName-required")
		.max(255, "originalName-too-long"),
	extension: z
		.string()
		.min(1, "extension-required")
		.max(10, "extension-too-long"),
	mimeType: z
		.string()
		.min(1, "mimeType-required")
		.max(100, "mimeType-too-long"),
	size: z.number().min(1, "file-size-too-small"),
});

export { zObjectId, deleteFileSchema, uploadFileSchema };
