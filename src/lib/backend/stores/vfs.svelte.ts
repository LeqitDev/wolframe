import { SvelteMap } from "svelte/reactivity";
import { ActionRequiredError, FileAlreadyExistsError, FileType, type File, type IBackendFileSystem } from "@/app.types";
import { Result } from "../functionals";
import { Path } from "../path";
import { getContext, setContext } from "svelte";
import { TreeNode } from "./vfs/TreeNode.svelte";
import monacoController from "../monaco";
import eventController from "../events";
import { debug } from "../utils";


class VirtualFileSystem {
    private files: SvelteMap<string, TreeNode> = new SvelteMap();
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

        eventController.register("command/file:open", this.handleOpenFileRequestedEvent.bind(this));
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
            const error = result.error;

            if (error instanceof FileAlreadyExistsError) {
                return Result.err(new Error(`File or folder with name '${error.file.file.name}' already exists at this location. Please choose a different name.`));
            }
        }

        const model = monacoController.createModel(file.id, treeNode.extension!, content ?? "", undefined);
        treeNode.setModel(model); // set the model for the file

        // Add file change listener
        model.onDidChangeContent((event) => {
            eventController.fire("file:edited", treeNode, event)
        })

        this.files.set(file.id, treeNode);
        eventController.fire("file:created", treeNode); // fire the file created event
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
        if (!fileNode.isFile) { // todo: request action to delete recursively
            for (const child of fileNode.getChildren()) {
                this.removeFile(child.file.id);
            }
        }
        fileNode.model?.dispose();
        fileNode.delete();
        this.files.delete(id);
        eventController.fire("file:deleted", fileNode); // fire the file deleted event
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
            const error = result.error;
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

        const result = newParentNode.addChild(fileNode); // add to the new parent
        if (!result.ok) {
            const error = result.error;
            if (error instanceof FileAlreadyExistsError) { // return actionrequirederror because filename in new parent already exists
                return Result.err(new ActionRequiredError<() => void, () => void>(
                    () => {
                        console.log("Accept");
                        error.file.delete(); // delete the file with the same name in the new parent

                        parentNode.removeChild(fileNode); // remove from the current parent

                        const result = newParentNode.addChild(fileNode); // add to the new parent

                        if (result.ok) {
                            fileNode.parent = newParentNode; // set the new parent
                            fileNode.file.updatedAt = Date.now(); // update the updatedAt timestamp
                        } else {
                            console.log("Error adding file to new parent", result.error);
                        }
                    },
                    () => {
                        console.log("Rejected");
                    },
                    `File or folder with name '${error.file.file.name}' already exists at this location. Do you want to overwrite the file?`
                ));
            }
            return Result.err(error);
        }

        parentNode.removeChild(fileNode); // remove from the current parent

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

    /**
     * Gets all files in the file system.
     * @returns An array of all files in the file system.
     */
    getFiles(): TreeNode[] {
        return Array.from(this.files.values());
    }

    private handleOpenFileRequestedEvent(idOrPath: string | null, callback?: (file: TreeNode) => void) {
        const fileNode = this.openFileRequested(idOrPath);
        if (fileNode) {
            callback?.(fileNode);
        }
    }

    private openFileRequested(id: string | null) {
        if (id == null) monacoController.setModel(null);
        else {
            const fileResult = this.getFileById(id);
            if (fileResult.ok) {
                const fileNode = fileResult.unwrap();
                fileNode.openFile(); // open the file in the editor
                return fileNode;
            } else {
                const byPath = this.getFileByPath(new Path(id));
                if (byPath.ok) {
                    const fileNode = byPath.unwrap();
                    fileNode.openFile(); // open the file in the editor
                    return fileNode;
                } else {
                    debug('error', 'vfs', fileResult.error, byPath.error);
                }
            }
        }
    }

    dispose() {
        this.files.forEach((file) => {
            file.model?.dispose();
        });
        this.files.clear();
        eventController.unregister("command/file:open", this.handleOpenFileRequestedEvent.bind(this));
    }
}

const symbol = Symbol('virtualFileSystem');

export function getVirtualFileSystem(): VirtualFileSystem {
    return getContext<ReturnType<typeof setVirtualFileSystem>>(symbol);
}

export function setVirtualFileSystem() {
    return setContext(symbol, new VirtualFileSystem());
}