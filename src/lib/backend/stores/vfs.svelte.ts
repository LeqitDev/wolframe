import { SvelteMap } from "svelte/reactivity";
import { FileType, type File, type IBackendFileSystem } from "@/app.types";

class VirtualFile {
    modified: boolean = $state(false);

    file: File;

    constructor(file: File) {
        this.file = file;
    }
}

class TreeNode extends VirtualFile {
    children: SvelteMap<string, TreeNode> = new SvelteMap();
    parent: TreeNode | null;

    constructor(file: File, parent: TreeNode | null = null) {
        super(file);
        this.parent = parent;
    }
}

class VirtualFileSystem {
    openFiles: SvelteMap<string, VirtualFile> = new SvelteMap();
    files: Map<string, TreeNode> = new Map();
    backend: IBackendFileSystem | null = null;
    useBackend: boolean = false;
    root: TreeNode = new TreeNode({
        id: "root",
        name: "root",
        type: FileType.Folder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        path: "/",
    });
}