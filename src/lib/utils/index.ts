import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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


type onSidebarFileClick = {name: 'sidebarFileClick', args: {file: App.VFS.Sidebar.File}};
type onSidebarNodeMoved = {name: 'sidebarNodeMoved', args: {node: App.VFS.Sidebar.Node, prev_path: string}};
type onSidebarNewFile = {name: 'sidebarNewFile', args: {file: App.VFS.Sidebar.File}};
type onSidebarNewDir = {name: 'sidebarNewDir', args: {dir: App.VFS.Sidebar.Folder}};
type onSidebarFileDeleted = {name: 'sidebarFileDeleted', args: {file: App.VFS.Sidebar.File}};
type onSidebarDirDeleted = {name: 'sidebarDirDeleted', args: {dir: App.VFS.Sidebar.Folder}};
type onSidebarPreviewFileChange = {name: 'sidebarPreviewFileChange', args: {file: App.VFS.Sidebar.File}};

type SidebarEvents = onSidebarFileClick | onSidebarNodeMoved | onSidebarNewFile | onSidebarNewDir | onSidebarFileDeleted | onSidebarDirDeleted | onSidebarPreviewFileChange;

type onVFSInitialized = {name: 'VFSInitialized', args: {}};
type onMonacoInitialized = {name: 'monacoInitialized', args: {}};
type onEditorInitialized = {name: 'editorInitialized', args: {}};

type ControllerEvents = SidebarEvents | onVFSInitialized | onMonacoInitialized | onEditorInitialized;

export class EventController {
	private listeners: Map<string, Set<Function>> = new Map();

	constructor() {}

	register(event: ControllerEvents['name'], listener: (args: ControllerEvents['args']) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(listener);
	}

	unregister(event: ControllerEvents['name'], listener: (args: ControllerEvents['args']) => void) {
		if (!this.listeners.has(event)) return;
		this.listeners.get(event)!.delete(listener);
	}

	fire(event: ControllerEvents['name'], args?: ControllerEvents['args']) {
		if (!this.listeners.has(event)) return;
		this.listeners.get(event)!.forEach((listener) => listener(args));
	}
}