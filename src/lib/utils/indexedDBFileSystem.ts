import { uuidv4 } from '.';
import { type IFileSystem, type File, FileType } from '../../app.types';
import { IndexedDBAccessor } from './indexedDB';

const fileStoreName = 'files';
const blobStoreName = 'blobs';

interface FileStore {
	id: string;
	name: string;
	parentId?: string;
	isDir: boolean;
	createdAt: Date;
	updatedAt: Date;
	path: string;
}

interface BlobStore {
	id: string;
	blob: Blob;
}

function fileToFileStore(f: File): FileStore {
	return {
		id: f.id,
		name: f.name,
		parentId: f.parentId,
		isDir: f.type === FileType.Directory,
		createdAt: f.createdAt,
		updatedAt: f.updatedAt,
		path: f.path
	};
}

/*
 * Normalizes a file path by ensuring it starts with a '/' and does not end with a '/'.
 * It also checks for invalid characters in the path. And replaces equal separators (e.g. '///' or '\') with a single '/'.
 * @param path The file path to normalize.
 * @returns The normalized file path.
 * @throws Error if the path contains invalid characters.
 */
function normalizePath(path: string) {
	if (!path.startsWith('/')) {
		path = '/' + path;
	}
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	// replace equal separators with a single '/'
	path = path.replace(/(\/|\\)+/g, '/');
	// replace leading and trailing spaces
	path = path.trim();
	// replace multiple spaces with a single space
	path = path.replace(/\s+/g, ' ');
	// test for valid path
	if (path.match(/[^a-zA-Z0-9_.\-/]/)) {
		throw new Error(`Invalid path: ${path}`);
	}
	return path; // normalized path in form of '/path/to/file.txt'
}

function checkFileName(name: string) {
	if (!name || name.length === 0) {
		throw new Error(`Invalid file name: ${name}`);
	}
	if (name.match(/[^a-zA-Z0-9_.-]/)) {
		throw new Error(`Invalid file name: ${name}, ${name.match(/[^a-zA-Z0-9_.-]/)}`);
	}
	return name;
}

export class IndexedDBFileSystem implements IFileSystem {
	private files: Map<string, File> = new Map(); // id to file mapping
	private ids: Map<string, string> = new Map(); // path to id mapping
	private idb: IndexedDBAccessor<{ files: FileStore; blobs: BlobStore }>;

	constructor() {
		this.idb = new IndexedDBAccessor('playground', 1, {
			1: (db) => {
				const fileStore = db.createObjectStore(fileStoreName, { keyPath: 'id' });
				fileStore.createIndex('parentId', 'parentId', { unique: false });

				db.createObjectStore(blobStoreName, { keyPath: 'id' });
			}
		});
	}

	/*
	 * Initializes the IndexedDB and fetches all files from it.
	 * @returns A promise that resolves when the operation is complete.
	 */
	async init() {
		await this.idb.open();
		await this.fetchAllFiles();
	}

	/*
	 * Deletes a file from the file system. If the file is a directory, it throws an error if the directory is not empty.
	 * @param id The ID of the file to delete.
	 * @returns The deleted file object.
	 * @throws Error if the file is not found or if it is a non-empty directory.
	 */
	async deleteFile(id: string) {
		if (!this.files.has(id)) {
			throw new Error(`File not found: ${id}`);
		}
		const file = this.files.get(id)!;

		if (
			file.type === FileType.Directory &&
			Array.from(this.files.values()).some((f) => f.parentId === file.id)
		) {
			throw new Error(`Cannot delete non-empty directory: ${file.path}`);
		}

		this.files.delete(id);
		this.ids.delete(file.path);
		
		await this.idb.delete(fileStoreName, file.id);
		if (file.type !== FileType.Directory) await this.idb.delete(blobStoreName, file.id);

		return file;
	}

	/*
	 * Reads a file from the IndexedDB. If the file is a directory, it throws an error.
	 * @param id The ID of the file to read.
	 * @returns The content of the file.
	 * @throws Error if the file is not found or if it is a directory.
	 */
	async readFile(id: string) {
		const file = this.files.get(id);
		if (!file) {
			throw new Error(`File not found: ${id}`);
		}
		if (file.type === FileType.Directory) {
			throw new Error(`Cannot read a directory: ${file.path}`);
		}
		return file.content!;
	}

	/*
	 * Writes content to a file. If the file does not exist, it will be created. If the content is null, it will create a directory.
	 * @param path The path of the file to write.
	 * @param content The content to write to the file. If null, a directory will be created.
	 * @returns The written file object.
	 * @throws Error if the file already exists or if the content is null and the file already exists.
	 */
	async writeFile(path: string, content: string | null) {
		path = normalizePath(path);

		if (content === null) {
			if (!this.ids.has(path)) {
				const file = await this.addDirectory(path);
				return file;
			}
			throw new Error(`Cannot write null content to a file. Path: ${path}, Content: "${content}"`);
		}

		const fileId = this.ids.get(path);
		if (!fileId) {
			const file = await this.addFile(path, content);
			return file;
		}
		const file = this.files.get(fileId)!;

		const blobId = file.id;
		const blob: Blob = new Blob([content], { type: 'text/plain' });
		await this.idb.set(blobStoreName, { id: blobId, blob });

		file.updatedAt = new Date();
		await this.idb.set(fileStoreName, fileToFileStore(file));
		file.content = content;
		return file;
	}

	/*
	 * Renames a file or directory. If the new name already exists, it throws an error.
	 * @param id The ID of the file to rename.
	 * @param newName The new name for the file or directory.
	 * @returns The renamed file object.
	 * @throws Error if the file is not found or if the new name already exists.
	 */
	async renameFile(id: string, newName: string) {
		if (!this.files.has(id)) {
			throw new Error(`File not found: ${id}`);
		}
		const file = this.files.get(id)!;

		checkFileName(newName);

		const parentPath = file.path.split('/').slice(0, -1).join('/');
		const newPath = `${parentPath}/${newName}`;
		if (Array.from(this.files.entries()).some(([, value]) => value.path === newPath)) {
			throw new Error(`File already exists: ${newPath}`);
		}

		const oldPath = file.path;
		file.name = newName;
		file.path = newPath;
		this.files.set(file.id, file);
		this.ids.delete(oldPath);
		this.ids.set(newPath, file.id);
		await this.idb.set(fileStoreName, fileToFileStore(file));

		if (file.type === FileType.Directory) {
			const replacePathOnChildren = (oldPath: string, newPath: string, parent: File) => {
				for (const [, value] of this.files.entries()) {
					if (value.parentId === parent.id) {
						if (value.path.startsWith(oldPath)) {
							const newChildPath = value.path.replace(oldPath, newPath);
							value.path = newChildPath;
							this.files.set(value.id, value);
							this.ids.delete(value.path);
							this.ids.set(newChildPath, value.id);
							this.idb.set(fileStoreName, fileToFileStore(value));
						}
						// Recursively replace paths in child directories
						if (value.type === FileType.Directory) {
							replacePathOnChildren.call(this, oldPath, newPath, value);
						}
					}
				}
			};

			replacePathOnChildren.call(this, oldPath, newPath, file);
		}

		return file;
	}

	/*
	 * Moves a file or directory to a new path. If the new path already exists, it throws an error.
	 * @param id The ID of the file to move.
	 * @param newPath The new path for the file or directory.
	 * @returns The moved file object.
	 * @throws Error if the file is not found, if the new path already exists, or if the file is a non-empty directory.
	 * @throws Error if the parent directory does not exist.
	 */
	async moveFile(id: string, newPath: string) {
		newPath = normalizePath(newPath);

		if (!this.files.has(id)) {
			throw new Error(`File not found: ${id}`);
		}
		const file = this.files.get(id)!;
		if (
			file.type === FileType.Directory &&
			this.files.values().some((f) => f.parentId === file.id)
		) {
			throw new Error(`Cannot move non-empty directory: ${file.path}`);
		}

		const parentPath = newPath.split('/').slice(0, -1).join('/');
		const parentId = this.ids.get(parentPath);
		if (!parentId && parentPath.length > 0) {
			await this.addDirectory(parentPath);
		}

		if (this.ids.has(newPath)) {
			throw new Error(`File already exists: ${newPath}`);
		}

		file.name = newPath.split('/').pop()!;
		file.path = newPath;
		file.updatedAt = new Date();
		file.parentId = parentId;

		this.files.set(file.id, file);
		this.ids.delete(file.path);
		this.ids.set(newPath, file.id);
		await this.idb.set(fileStoreName, fileToFileStore(file));

		return file;
	}

	/*
	 * Lists all files in the file system.
	 * @returns A promise that resolves to an array of file objects.
	 */
	async listEntries() {
		await this.fetchAllFiles();
		return Array.from(this.files.values());
	}

	/*
	 * Closes the IndexedDB connection.
	 * @returns A promise that resolves when the operation is complete.
	 */
	async close() {
		await this.idb.close();
	}

	/*
	 * Gets the Path of a file by its id.
	 * @param id The ID of the file.
	 * @returns The path of the file.
	 * @throws Error if the file is not found.
	 */
	getPath(id: string) {
		return this.files.get(id)?.path;
	}

	/*
	 * Fetches all files from the IndexedDB and populates the files map.
	 * @returns A map of file IDs to file objects.
	 */
	private async fetchAllFiles() {
		const keys = await this.idb.getAllKeys(fileStoreName);
		for (const key of keys) {
			const file = await this.idb.get(fileStoreName, key);
			if (!file) continue;

			const parsedFile: File = {
				id: file.id,
				name: file.name,
				parentId: file.parentId,
				type: file.isDir ? FileType.Directory : FileType.File,
				createdAt: file.createdAt,
				updatedAt: file.updatedAt,
				path: file.path
			};

			if (!file?.isDir) {
				const blobEntry = await this.idb.get(blobStoreName, file.id);
				if (blobEntry) {
					parsedFile.content = await blobEntry.blob.text();
				}
			}
			this.files.set(file.id, parsedFile);
		}
		if (keys.length === 0) {
			await this.writeFile('/main.typ', '');
		}
		return this.files;
	}


	/*
	 * Clears all files from the IndexedDB and the files map.
	 * @returns A promise that resolves when the operation is complete.
	 */
	private async clear() {
		this.files.clear();
		await this.idb.clear(fileStoreName);
	}

	/*
	 * Adds a directory to the file system. If the parent directory does not exist, it will be created.
	 * @param path The path of the directory to add.
	 * @returns The added directory object.
	 * @throws Error if the directory already exists or if the parent directory does not exist.
	 */
	private async addDirectory(path: string) {
		path = normalizePath(path);

		const name = path.split('/').pop();
		checkFileName(name!);

		const parentPath = path.split('/').slice(0, -1).join('/');
		const parentId = this.ids.get(parentPath);
		if (!parentId && parentPath.length > 0) {
			await this.addDirectory(parentPath);
		}

		const file: File = {
			id: uuidv4(),
			name: name!,
			parentId,
			type: FileType.Directory,
			createdAt: new Date(),
			updatedAt: new Date(),
			path
		};

		this.files.set(file.id, file);
		this.ids.set(path, file.id);
		await this.idb.set(fileStoreName, fileToFileStore(file));
		return file;
	}

	/*
	 * Adds a file to the file system. If the parent directory does not exist, it will be created.
	 * @param path The path of the file to add.
	 * @param content The content of the file.
	 * @returns The added file object.
	 * @throws Error if the file already exists or if the parent directory does not exist.
	 */
	private async addFile(path: string, content: string) {
		path = normalizePath(path);

		const name = path.split('/').pop();
		checkFileName(name!);

		const parentPath = path.split('/').slice(0, -1).join('/');
		const parentId = this.ids.get(parentPath);
		if (!parentId && parentPath.length > 0) {
			await this.addDirectory(parentPath);
		}

		const file: File = {
			id: uuidv4(),
			name: name!,
			parentId,
			type: FileType.File,
			createdAt: new Date(),
			updatedAt: new Date(),
			path
		};

		this.files.set(file.id, file);
		this.ids.set(path, file.id);
		await this.idb.set(fileStoreName, fileToFileStore(file));

		// Create the initial blob
		const blob: Blob = new Blob([content], { type: 'text/plain' });
		try {
			await this.idb.set(blobStoreName, { id: file.id, blob });
		} catch (e) {
			throw Error(`Error writing blob to IndexedDB: ${e}, path: ${path}, content: "${content}"`);
		}

		// Update the file with the content
		file.content = content;
		return file;
	}
}
