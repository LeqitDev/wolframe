import { SvelteMap } from "svelte/reactivity";
import { VirtualFile } from "./VirtualFile.svelte";
import { Path } from "../../path";
import { FileAlreadyExistsError, FileType, type File } from "@/app.types";
import { Result } from "../../functionals";


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
     * Checks if a filename already exists in the current node.
     * @param name The name of the child to check
     * @returns True if the child exists, false otherwise
     */
    hasChild(name: string): boolean {
        if (name === "") return false; // root node has no name
        return this.children.has(name);
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