export enum FileType {
    File = "file",
    Directory = "directory"
}

type MetadataExtension<T> = Record<string, T>;

interface FileEntry {
    id: string;
    name: string;
    parentId?: string;
    type: FileType;
    createdAt: Date;
    updatedAt: Date;
    path: string;
    metadata?: MetadataExtension<unknown>[];
}

export interface File extends FileEntry {
    content?: string;
}

export interface IFileSystem {
    init: () => Promise<void>;

    deleteFile: (id: string) => Promise<File>;
    readFile: (id: string) => Promise<string>;
    writeFile: (path: string, content: string | null) => Promise<File>;
    renameFile: (id: string, newName: string) => Promise<File>;
    moveFile: (id: string, newPath: string) => Promise<File>;

    listEntries: () => Promise<File[]>;

    close: () => Promise<void>;
}