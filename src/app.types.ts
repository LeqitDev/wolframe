import type { TreeNode } from "./lib/backend/stores/vfs.svelte";

export enum LoadingComponents {
	Compiler = 'compiler',
	Renderer = 'renderer',
	Monaco = 'monaco'
}

export enum FileType {
	Folder = 'folder',
	File = 'file'
}

type MetadataExtension<T> = Record<string, T>;

interface FileMetadata {
	id: string;
	name: string;
	parentId?: string;
	type: FileType;
	createdAt: number;
	updatedAt: number;
	metadata?: MetadataExtension<unknown>[];
}

export interface File extends FileMetadata {
	content?: string;
}

export interface IBackendFileSystem {

}

export class FileAlreadyExistsError extends Error {
	file: TreeNode;

	constructor(fileName: string, file: TreeNode) {
		super(`File "${fileName}" already exists.`);
		this.name = 'FileAlreadyExistsError';
		this.file = file;
	}
}

export class ActionRequiredError<A, R> extends Error {
	accept: A;
	reject: R;

	constructor(accept: A, reject: R, message: string) {
		super(message);
		this.name = 'ActionRequiredError';
		this.accept = accept;
		this.reject = reject;
	}
}