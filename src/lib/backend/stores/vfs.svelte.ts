import { SvelteMap } from "svelte/reactivity";
import { FileType, type File, type IBackendFileSystem } from "@/app.types";
import { Result } from "../functionals";
import { Path } from "../path";
import { getContext, setContext } from "svelte";

class VirtualFile {
    modified: boolean = $state(false);

    file: File;

    constructor(file: File) {
        this.file = file;
    }
}

export class TreeNode extends VirtualFile {
    children: SvelteMap<string, TreeNode> = new SvelteMap();
    parent: TreeNode | null;

    constructor(file: File, parent: TreeNode | null = null) {
        super(file);
        this.parent = parent;
    }

    get path(): Path {
        return this.parent ? this.parent.path.append(this.file.name) : new Path(this.file.name);
    }

    get isRoot(): boolean {
        return this.parent === null;
    }

    get isFile(): boolean {
        return this.file.type === FileType.File;
    }

    addChild(file: File | VirtualFile | TreeNode) {
        if (file instanceof TreeNode) {
            this.children.set(file.file.name, file);
        } else if (file instanceof VirtualFile) {
            this.children.set(file.file.name, new TreeNode(file.file, this));
        } else {
            this.children.set(file.name, new TreeNode(file, this));
        }
    }

    getChildren(): TreeNode[] {
        return Array.from(this.children.values()).map((child) => child as TreeNode);
    }
}

class VirtualFileSystem {
    openFiles: SvelteMap<string, VirtualFile> = new SvelteMap();
    private files: Map<string, TreeNode> = new Map();
    private backend: IBackendFileSystem | null = null;
    private useBackend: boolean;
    private root: TreeNode = new TreeNode({
        id: "root",
        name: "",
        type: FileType.Folder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    constructor(
        backend: IBackendFileSystem | null = null
    ) {
        this.backend = backend;
        this.useBackend = backend !== null;

        if (this.useBackend) {
            // this.loadFilesFromBackend();
        }

        // !!!TEST!!!
        this.addFile("file1.txt", "Hello World");
        this.addFile("file2.txt", "Hello World");
    }

    getFileById(id: string): Result<TreeNode> {
        if (this.files.has(id)) {
            return Result.ok(this.files.get(id)!);
        }
        return Result.err(new Error(`File with id ${id} not found`));
    }

    getFileByPath(path: Path): Result<TreeNode> {
        const parts = path.rootless().split("/");
        let currentNode = this.root;

        for (const part of parts) {
            if (currentNode.children.has(part)) {
                currentNode = currentNode.children.get(part)!;
            } else {
                return Result.err(new Error(`File with path ${path} not found`));
            }
        }
        return Result.ok(currentNode);
    }

    addFile(name: string, content: string | null, parentId?: string): Result<TreeNode> {
        const file: File = {
            id: crypto.randomUUID(),
            name,
            type: content !== null ? FileType.File : FileType.Folder,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            content: content ?? undefined,
            parentId: parentId,
        };
        let treeNode: TreeNode;
        if (parentId) {
            const parentNodeResult = this.getFileById(parentId);
            if (!parentNodeResult.ok) {
                return Result.err(parentNodeResult.error);
            }
            const parentNode = parentNodeResult.unwrap();
            treeNode = new TreeNode(file, parentNode);
            parentNode.children.set(name, treeNode);
        } else {
            treeNode = new TreeNode(file);
            this.root.children.set(name, treeNode);
        }
        this.files.set(file.id, treeNode);
        return Result.ok(treeNode);
    }

    getTree(): TreeNode {
        return this.root;
    }
}

const symbol = Symbol('virtualFileSystem');

export function getVirtualFileSystem(): VirtualFileSystem {
    return getContext<ReturnType<typeof setVirtualFileSystem>>(symbol);
}

export function setVirtualFileSystem() {
    return setContext(symbol, new VirtualFileSystem());
}