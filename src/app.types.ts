interface MetadataExtension<T> {
    name: string;
    value: T;
}

interface FileMetadata {
    id: string;
    name: string;
    parentId?: string;
    isDir: boolean;
    createdAt: Date;
    updatedAt: Date;
    path: string;
    metadata?: MetadataExtension<unknown>[];
}

export interface File extends FileMetadata {
    content?: string;
}

export interface IFileSystem {
    init: () => Promise<void>;

    deleteFile: (path: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    renameFile: (oldPath: string, newPath: string) => Promise<void>;
    addDirectory: (path: string) => Promise<void>;

    listFiles: () => Promise<Map<string, File>>;
}