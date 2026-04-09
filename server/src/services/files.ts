// import fs from "fs-extra";
// import path from "path";
// import multer from "multer";
//
// import FileModel from "../models/File";
// import LoggingService from "./logging";
//
// const storagePath = path.resolve(__dirname, "../../../files");
// const storage = multer.memoryStorage();
//
// const saveFile = async (
// 	folderPath: string,
// 	data: {
// 		ownerId: string;
// 		name: string;
// 		size: number;
// 		type: string;
// 	},
// 	buffer: Buffer,
// ) => {
// 	const extension = data.name.split(".").pop() || "bin";
// 	const fileName = `${Date.now()}-${data.name}`; // Avoid name collisions
//
// 	const file = new FileModel({
// 		filePath: path.join(folderPath, fileName),
// 		folderPath,
// 		sharedWith: [],
// 		fileMetadata: {
// 			name: data.name,
// 			size: data.size,
// 			type: data.type,
// 			extension,
// 			isPreviewable: /^image|^video|^application\/pdf/.test(data.type),
// 		},
// 		metadata: {
// 			createdAt: new Date(),
// 			createdBy: data.ownerId,
// 			updatedAt: new Date(),
// 			updatedBy: data.ownerId,
// 			documentVersion: 1,
// 		},
// 	});
//
// 	await file.save();
//
// 	const absolutePath = path.join(storagePath, folderPath);
// 	await fs.ensureDir(absolutePath);
//
// 	const fileOutputPath = path.join(
// 		absolutePath,
// 		file._id.toString() + "." + extension,
// 	);
// 	await fs.writeFile(fileOutputPath, buffer);
//
// 	LoggingService.log({
// 		level: "info",
// 		source: "application",
// 		message: `File saved: ${data.name} (${file._id})`,
// 	});
//
// 	return file;
// };
//
// const deleteFile = async (fileId: string) => {
// 	const file = await FileModel.findById(fileId);
//
// 	if (!file) {
// 		return { status: "file-not-found" };
// 	}
//
// 	await FileModel.findByIdAndDelete(fileId);
//
// 	const extension = file.fileMetadata.extension;
// 	const fullPath = path.join(
// 		storagePath,
// 		file.folder,
// 		`${fileId}.${extension}`,
// 	);
//
// 	if (await fs.pathExists(fullPath)) {
// 		await fs.unlink(fullPath);
// 	}
//
// 	LoggingService.log({
// 		level: "info",
// 		source: "application",
// 		message: `File deleted: ${file.fileMetadata.name} (${file._id})`,
// 	});
//
// 	return { status: "success" };
// };
//
// const getFolderContents = async (
// 	userId: string,
// 	folder: string,
// ): Promise<{
// 	status: "success" | "folder-not-found";
// 	contents: {
// 		name: string;
// 		type: "file" | "folder";
// 		size: number;
// 		modified: Date;
// 	}[];
// }> => {
// 	const folderPath = path.join(storagePath, "users", userId, folder);
//
// 	if (!(await fs.pathExists(folderPath))) {
// 		return { status: "folder-not-found", contents: [] };
// 	}
//
// 	const files = await fs.readdir(folderPath, { withFileTypes: true });
//
// 	const contents: {
// 		name: string;
// 		type: "file" | "folder";
// 		size: number;
// 		modified: Date;
// 	}[] = await Promise.all(
// 		files.map(async (file) => {
// 			const filePath = path.join(folderPath, file.name);
// 			const stats = await fs.stat(filePath);
//
// 			return {
// 				name: file.name,
// 				type: file.isDirectory() ? "folder" : "file",
// 				size: stats.size,
// 				modified: stats.mtime,
// 			};
// 		}),
// 	);
//
// 	return { status: "success", contents };
// };
//
// const renameFile = async (fileId: string, newName: string) => {
// 	const file = await FileModel.findById(fileId);
//
// 	if (!file) {
// 		return { status: "file-not-found" };
// 	}
//
// 	const extension = file.fileMetadata.extension;
// 	const oldDiskPath = path.join(
// 		storagePath,
// 		file.folder,
// 		`${fileId}.${extension}`,
// 	);
//
// 	file.fileMetadata.name = newName;
// 	file.metadata.updatedAt = new Date();
//
// 	await file.save();
//
// 	const newExtension = newName.split(".").pop() || extension;
// 	const newDiskPath = path.join(
// 		storagePath,
// 		file.folder,
// 		`${fileId}.${newExtension}`,
// 	);
//
// 	if (oldDiskPath !== newDiskPath && (await fs.pathExists(oldDiskPath))) {
// 		await fs.rename(oldDiskPath, newDiskPath);
// 	}
//
// 	LoggingService.log({
// 		level: "info",
// 		source: "services:files",
// 		message: `File renamed to: ${newName} (${file._id})`,
// 	});
//
// 	return { status: "success" };
// };
//
// export default {
// 	saveFile,
// 	deleteFile,
// 	getFolderContents,
// 	renameFile,
// 	storage,
// 	storagePath,
// };
