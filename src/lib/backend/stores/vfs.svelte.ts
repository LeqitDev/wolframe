import { SvelteMap } from "svelte/reactivity";
import { FileType, type File, type IBackendFileSystem } from "@/app.types";
import { Result } from "../functionals";
import { Path } from "../path";
import { getContext, setContext } from "svelte";

class VirtualFile {
    modified: boolean = $state(false);
    open: boolean = $state(false);
    input: boolean = $state(false);
    renaming: boolean = $state(false);

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
        if (this.file.id === "root" && this.parent === null) {
            return new Path(this.file.name, true);
        }
        return this.parent ? this.parent.path.append(this.file.name) : new Path(this.file.name);
    }

    get isRoot(): boolean {
        return this.parent === null && this.file.id === "root";
    }

    get isFile(): boolean {
        return this.file.type === FileType.File;
    }

    addChild(file: File | VirtualFile | TreeNode): Result<void, Error> {
        const name = file instanceof File ? file.name : (file as VirtualFile).file.name;
        if (this.children.has(name)) {
            return Result.err(new Error(`File with name ${name} already exists`, {
                cause: this.children.get(name),
            }));
        }

        if (file instanceof TreeNode) {
            this.children.set(file.file.name, file);
        } else if (file instanceof VirtualFile) {
            this.children.set(file.file.name, new TreeNode(file.file, this));
        } else {
            this.children.set(file.name, new TreeNode(file, this));
        }

        return Result.ok(undefined as void);
    }

    removeChild(file: File | VirtualFile | TreeNode) {
        if (file instanceof VirtualFile || file instanceof TreeNode) {
            this.children.delete(file.file.name);
        } else {
            this.children.delete(file.name);
        }
    }

    getChildren(): TreeNode[] {
        return Array.from(this.children.values()).toSorted((a, b) => {
            if (a.input && !a.renaming) {
                return 1;
            } else if (b.input && !b.renaming) {
                return -1;
            }

            if (a.isFile && b.isFile) {
                return a.file.name.localeCompare(b.file.name);
            } else if (a.isFile) {
                return 1;
            } else if (b.isFile) {
                return -1;
            }
            return a.file.name.localeCompare(b.file.name);
        });
    }

    delete() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
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

    addFile(name: string, content: string | null, parentId?: string, isInput: boolean = false): Result<TreeNode> {
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
        let result: Result<void, Error>;

        if (parentId && parentId !== "root") {
            const parentNodeResult = this.getFileById(parentId);
            if (!parentNodeResult.ok) {
                return Result.err(parentNodeResult.error);
            }

            const parentNode = parentNodeResult.unwrap();
            treeNode = new TreeNode(file, parentNode);
            treeNode.input = isInput;

            result = parentNode.addChild(treeNode);
        } else {
            treeNode = new TreeNode(file, this.root);
            treeNode.input = isInput;

            result = this.root.addChild(treeNode);
        }

        if (!result.ok) {
            let error = result.error;

            if (error.cause instanceof TreeNode) {
                return Result.ok(error.cause);
            }
        }

        this.files.set(file.id, treeNode);
        return Result.ok(treeNode);
    }

    removeFile(id: string): Result<TreeNode> {
        const fileResult = this.getFileById(id);
        if (!fileResult.ok) {
            return Result.err(fileResult.error);
        }
        const fileNode = fileResult.unwrap();
        if (fileNode.isRoot) {
            return Result.err(new Error("Cannot delete root node"));
        }
        if (!fileNode.isFile) {
            for (const child of fileNode.getChildren()) {
                this.removeFile(child.file.id);
            }
        }
        fileNode.delete();
        this.files.delete(id);
        return Result.ok(fileNode);
    }

    renameFile(id: string, newName: string): Result<TreeNode> {
        const fileResult = this.getFileById(id);
        if (!fileResult.ok) {
            return Result.err(fileResult.error);
        }
        const fileNode = fileResult.unwrap();
        if (fileNode.isRoot) {
            return Result.err(new Error("Cannot rename root node"));
        }
        const parentNode = fileNode.parent!;
        parentNode.removeChild(fileNode);

        fileNode.file.name = newName;
        fileNode.file.updatedAt = Date.now();

        const result = parentNode.addChild(fileNode);
        if (!result.ok) {
            let error = result.error;
            if (error.cause instanceof TreeNode) {
                return Result.ok(error.cause);
            }
            return Result.err(error);
        }

        return Result.ok(fileNode);
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