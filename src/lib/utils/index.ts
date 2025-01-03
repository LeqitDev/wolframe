import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number = 300) => {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
};

export function convertRemToPixels(rem: number) {
	return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export { PreviewDragger } from "./previewDragging";

/* sidebarFileClick(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarNodeMoved(node: App.VFS.Sidebar.FileSystemNode, prev_path: string) {}
	sidebarNewFile(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarNewDir(dir: App.VFS.Sidebar.FileSystemFolder) {}
	sidebarFileDeleted(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarDirDeleted(dir: App.VFS.Sidebar.FileSystemFolder) {}
	sidebarPreviewFileChange(file: App.VFS.Sidebar.FileMetadata) {} */

interface SidebarEvents {
	"onSidebarFileClick": [file: App.VFS.Sidebar.File],
	"onSidebarNodeMoved": [node: App.VFS.Sidebar.Node, prev_path: string],
	"onSidebarNewFile": [file: App.VFS.Sidebar.File],
	"onSidebarNewDir": [dir: App.VFS.Sidebar.Folder],
	"onSidebarFileDeleted": [file: App.VFS.Sidebar.File],
	"onSidebarDirDeleted": [dir: App.VFS.Sidebar.Folder],
	"onSidebarPreviewFileChange": [file: App.VFS.Sidebar.File]
};

interface EditorEvents {
	"onMonacoInitialized": [];
	"onEditorInitialized": [];
	"onDidChangeModelContent": [
		model: Monaco.editor.ITextModel,
		e: Monaco.editor.IModelContentChangedEvent
	];
};

type ControllerEvents = SidebarEvents & EditorEvents & {
	"onVFSInitialized": [];
};

export class EventController {
    private listeners = new Map<keyof ControllerEvents, Set<(...args: any[]) => void>>();

    public register<E extends keyof ControllerEvents>(event: E, callback: (...args: ControllerEvents[E]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public unregister<E extends keyof ControllerEvents>(event: E, callback: (...args: ControllerEvents[E]) => void): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(callback);
            if (this.listeners.get(event)!.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    public fire<E extends keyof ControllerEvents>(event: E, ...args: ControllerEvents[E]): void {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)!) {
                callback(...args);
            }
        }
    }
}