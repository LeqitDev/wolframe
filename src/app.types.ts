export interface IFileSystem {
    init: () => Promise<void>;

    deleteFile: (path: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    renameFile: (oldPath: string, newPath: string) => Promise<void>;

    listFiles: () => Promise<Record<string, string>>;
}