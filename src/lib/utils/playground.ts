import { uuidv4 } from ".";
import type { IFileSystem, File } from "../../app.types";
import { IndexedDBAccessor } from "./indexedDB";

const fileStoreName = "files";
const blobStoreName = "blobs";

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

export class PlaygroundFileHandler implements IFileSystem {
    private files: Map<string, File> = new Map();
    private idb: IndexedDBAccessor<{"files": FileStore, "blobs": BlobStore}>;

    constructor() {
        this.idb = new IndexedDBAccessor("playground", 1, {
            1: (db) => {
                const fileStore = db.createObjectStore(fileStoreName, { keyPath: "id" });
                fileStore.createIndex("parentId", "parentId", { unique: false });

                db.createObjectStore(blobStoreName, { keyPath: "id" });
            }
        });
    }

    async init() {
        await this.idb.open();
        await this.fetchAllFiles();
    }

    get allFiles() {
        return this.files;
    }

    get asVFS() {
        return this.fetchAllFiles().then((files) => {
            return Object.entries(files).map(([path, content]) => ({ filename: path, content }));
        });
    }

    get mainFilePath() {
        if (this.files.has("/main.typ")) {
            return "/main.typ";
        } else if (this.files.has('/lib.typ')) {
            return '/lib.typ';
        } else if (Object.keys(this.files).length > 0) {
            return Object.keys(this.files)[0];
        } else {
            return '';
        }
    }

    async readFile(path: string) {
        const file = this.files.get(path);
        if (!file) {
            throw new Error("File not found");
        }
        if (file.isDir) {
            throw new Error("Cannot read a directory");
        }
        return file.content!;
    }

    async fetchAllFiles() {
        const keys = await this.idb.getAllKeys(fileStoreName);
        for (const key of keys) {
            const file = await this.idb.get(fileStoreName, key);
            if (!file) continue;

            const parsedFile: File = {
                id: file.id,
                name: file.name,
                parentId: file.parentId,
                isDir: file.isDir,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
                path: file.path
            }

            if (!file?.isDir) {
                const blobEntry = await this.idb.get(blobStoreName, file.id);
                if (blobEntry) {
                    parsedFile.content = await blobEntry.blob.text();
                }
            }
            this.files.set(file.path, parsedFile);
        }
        if (keys.length === 0) {
            this.writeFile("/main.typ", "");
        }
        return this.files;
    }

    async addDirectory(path: string) {
        const name = path.split('/').pop();
        const parentPath = path.split('/').slice(0, -1).join('/');
        const parentId = this.files.get(parentPath)?.id;
        const file: File = {
            id: uuidv4(),
            name: name!,
            parentId,
            isDir: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            path
        }
        await this.idb.set(fileStoreName, file);
    }

    async addFile(path: string, content: string) {
        const name = path.split('/').pop();
        const parentPath = path.split('/').slice(0, -1).join('/');
        const parentId = this.files.get(parentPath)?.id;
        const file: FileStore = {
            id: uuidv4(),
            name: name!,
            parentId,
            isDir: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            path
        }
        await this.idb.set(fileStoreName, file);

        const blob: Blob = new Blob([content], { type: "text/plain" });
        await this.idb.set(blobStoreName, { id: file.id, blob });
    }

    async writeFile(path: string, content: string) {
        if (!this.files.has(path)) {
            await this.addFile(path, content);
            return;
        }
        const file = this.files.get(path)!;

        const blobId = file.id;
        const blob: Blob = new Blob([content], { type: "text/plain" });
        await this.idb.set(blobStoreName, { id: blobId, blob });
    }

    async deleteFile(path: string) {
        if (!this.files.has(path)) {
            throw new Error("File not found");
        }
        this.files.delete(path);
        await this.idb.delete(fileStoreName, path);
    }

    async renameFile(oldPath: string, newPath: string) {
        if (!this.files.has(oldPath)) {
            throw new Error("File not found");
        }
        const oldFile = this.files.get(oldPath)!;
        this.files.set(newPath, oldFile);
        this.files.delete(oldPath);
        await this.idb.delete(fileStoreName, oldPath);

        const newFile: FileStore = {
            id: oldFile.id,
            name: newPath.split('/').pop()!,
            parentId: oldFile.parentId,
            isDir: oldFile.isDir,
            createdAt: oldFile.createdAt,
            updatedAt: new Date(),
            path: newPath
        }

        await this.idb.set(fileStoreName, newFile);
    }

    async listFiles() {
        await this.fetchAllFiles();
        return this.files;
    }

    async clear() {
        this.files.clear();
        await this.idb.clear(fileStoreName);
    }
}