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
	path: string;
	metadata?: MetadataExtension<unknown>[];
}

export interface File extends FileMetadata {
	content?: string;
}

export interface IBackendFileSystem {
	
}