import { IndexedDBAccessor } from "./indexedDB";

export class PlaygroundFileHandler implements App.VFS.FileSystem {
    private files: Record<string, string> = {};
    private idb: IndexedDBAccessor<string>;

    constructor() {
        this.idb = new IndexedDBAccessor("playground", 1, "files");
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
        if (this.files["/main.typ"]) {
            return "/main.typ";
        } else if (this.files['/lib.typ']) {
            return '/lib.typ';
        } else if (Object.keys(this.files).length > 0) {
            return Object.keys(this.files)[0];
        } else {
            return '';
        }
    }

    async readFile(path: string) {
        return this.files[path];
    }

    async fetchAllFiles() {
        const keys = await this.idb.getAllKeys();
        for (const key of keys) {
            let content = await this.idb.get(key);
            if (content === null) continue;
            this.files[key] = content;
        }
        if (keys.length === 0) {
            this.writeFile("/main.typ", "");
        }
        return this.files;
    }

    async writeFile(path: string, content: string) {
        this.files[path] = content;
        await this.idb.set(path, content);
    }

    async deleteFile(path: string) {
        delete this.files[path];
        await this.idb.delete(path);
    }

    async renameFile(oldPath: string, newPath: string) {
        this.files[newPath] = this.files[oldPath];
        delete this.files[oldPath];
        await this.idb.delete(oldPath);
        await this.idb.set(newPath, this.files[newPath]);
    }

    async listFiles() {
        await this.fetchAllFiles();
        return this.files;
    }

    async clear() {
        this.files = {};
        await this.idb.clear();
    }
}