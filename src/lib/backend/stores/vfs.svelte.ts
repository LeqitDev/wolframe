import { SvelteMap } from "svelte/reactivity";
import { FileAlreadyExistsError, FileType, type File, type IBackendFileSystem } from "@/app.types";
import { Result } from "../functionals";
import { Path } from "../path";
import { getContext, setContext } from "svelte";

class VirtualFile {
    modified: boolean = $state(false); // file is modified
    open: boolean = $state(false); // open folder
    input: boolean = $state(false); // put input field instead of name
    renaming: boolean = $state(false); // don't delete the entry on submit just rename

    file: File;

    constructor(file: File) {
        this.file = file;
    }
}

export class TreeNode extends VirtualFile {
    children: SvelteMap<string, TreeNode> = new SvelteMap();
    parent: TreeNode | null;

    /**
     * Creates a new TreeNode.
     * 
     * @param file The file to be represented by the TreeNode.
     * @param parent The parent TreeNode. Null shall only be used for the root node.
     */
    constructor(file: File, parent: TreeNode | null = null) {
        super(file);
        this.parent = parent;
    }

    /**
     * Gets recursively the path of the current node.
     * 
     * @remarks
     * The path is a string representation of the node's location in the file system.
     * 
     * @see {@link Path} for more information about the path.
     * 
     * @returns The path of the current node.
     */
    get path(): Path {
        if (this.isRoot) {
            return new Path(this.file.name, true);
        }
        return this.parent ? this.parent.path.append(this.file.name) : new Path(this.file.name);
    }

    /**
     * Checks if the current node is the root node.
     * 
     * @remarks
     * The root node is the top-level node in the file system. It shall not be deleted, renamed or moved.
     */
    get isRoot(): boolean {
        return this.parent === null && this.file.id === "root";
    }

    /**
     * Checks if the current node is a file.
     */
    get isFile(): boolean {
        return this.file.type === FileType.File;
    }

    /**
     * Adds a child to the current node.
     * 
     * @remarks
     * The child can be a File, VirtualFile or TreeNode.
     * If the added child has a name that already exists in the current node, it will throw an {@link FileAlreadyExistsError} error unless `force` is set to true.
     * 
     * When using `force`, the child will be added overwriting and omitting the previous child. The previous child will not be deleted from the file system.
     * 
     * @param file The File or VirtualFile to add
     * @param force On duplicate name, force to add the file
     * @returns Result on whether the file was added or not
     */
    addChild(file: File | VirtualFile | TreeNode, force: boolean = false): Result<void, Error> {
        const name = file instanceof File ? file.name : (file as VirtualFile).file.name;
        if (this.children.has(name) && !force) {
            return Result.err(new FileAlreadyExistsError(name, this.children.get(name)!));
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

    /**
     * Removes a child from the current node.
     * 
     * @remarks
     * The child can be a {@link File}, {@link VirtualFile} or {@link TreeNode}.
     * 
     * @param {File | VirtualFile | TreeNode} file The File to remove
     */
    removeChild(file: File | VirtualFile | TreeNode) {
        if (file instanceof VirtualFile || file instanceof TreeNode) {
            this.children.delete(file.file.name);
        } else {
            this.children.delete(file.name);
        }
    }

    /**
     * Gets the children of the current node.
     * 
     * @remarks
     * The children are sorted by name and type. Folders are sorted before files. Inputs (new files) are sorted after folders and files.
     * 
     * @returns The children of the current node.
     */
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

    /**
     * Deletes the current node from the parent.
     * 
     * @remarks
     * The current node will be removed from the parent node. The current node will **not** be deleted from the file system.
     */
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

    /**
     * Gets the file by id.
     * @param id The id of the file to get.
     * @returns A result with the file or an error if the file was not found.
     */
    getFileById(id: string): Result<TreeNode> {
        if (this.files.has(id)) {
            return Result.ok(this.files.get(id)!);
        }
        return Result.err(new Error(`File with id ${id} not found`));
    }

    /**
     * Gets the file by path.
     * @param path The path of the file to get.
     * @returns A result with the file or an error if the file was not found.
     */
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

    /**
     * Adds a file to the file system.
     * @param name The name of the file to add.
     * @param content The content of the file to add, null if it is a folder.
     * @param parentId The id of the parent folder to add the file to. If not specified, it will be added to the root folder.
     * @param isInput Whether the file is an input file (for a new file) or not. Defaults to false.
     * @returns A result with the added file or an error if the file was not added.
     */
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

            if (error instanceof FileAlreadyExistsError) {
                return Result.ok(error.file);
            }
        }

        this.files.set(file.id, treeNode);
        return Result.ok(treeNode);
    }

    /**
     * Removes a file from the file system.
     * @param id The id of the file to remove.
     * @returns A result with the removed file or an error if the file was not removed.
     */
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

    /**
     * Renames a file in the file system.
     * @param id The id of the file to rename.
     * @param newName The new name of the file.
     * @returns A result with the renamed file or an error if the file was not renamed.
     */
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
        parentNode.removeChild(fileNode); // remove from the current parent

        fileNode.file.name = newName; // update the name
        fileNode.file.updatedAt = Date.now(); // update the updatedAt timestamp

        const result = parentNode.addChild(fileNode); // add to the new parent to save the entry with the new name
        if (!result.ok) {
            let error = result.error;
            if (error.cause instanceof TreeNode) {
                return Result.ok(error.cause);
            }
            return Result.err(error);
        }

        return Result.ok(fileNode);
    }

    /**
     * Moves a file in the file system.
     * @param id The id of the file to move.
     * @param newParentId The id of the new parent folder to move the file to. If not specified, it will be moved to the root folder.
     * @returns A result with the moved file or an error if the file was not moved.
     */
    moveFile(id: string, newParentId: string): Result<TreeNode> {
        const fileResult = this.getFileById(id);
        if (!fileResult.ok) {
            return Result.err(fileResult.error);
        }
        const fileNode = fileResult.unwrap();
        if (fileNode.isRoot) {
            return Result.err(new Error("Cannot move root node"));
        }
        let newParentNode: TreeNode;

        if (newParentId && newParentId !== "root") { // if not root search for the file
            const newParentResult = this.getFileById(newParentId);
            if (!newParentResult.ok) {
                return Result.err(newParentResult.error);
            }
            newParentNode = newParentResult.unwrap();
        } else {
            newParentNode = this.root;
        }

        if (newParentNode.isFile) {
            return Result.err(new Error("Cannot move to a file"));
        }

        if (newParentNode.file.id === fileNode.parent!.file.id) { // if the current parent is the same as the new parent, do nothing
            return Result.ok(fileNode);
        }

        const parentNode = fileNode.parent!;
        parentNode.removeChild(fileNode); // remove from the current parent

        const result = newParentNode.addChild(fileNode); // add to the new parent
        if (!result.ok) {
            let error = result.error;
            if (error instanceof FileAlreadyExistsError) {
                return Result.ok(error.file);
            }
            return Result.err(error);
        }
        fileNode.parent = newParentNode; // set the new parent
        fileNode.file.updatedAt = Date.now(); // update the updatedAt timestamp
        return Result.ok(fileNode);
    }

    /**
     * Gets the root node of the file system.
     * @returns The root node of the file system.
     */
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