import { setContext, getContext, type Snippet } from 'svelte';

export class LayoutStore {
	private _menu: App.IProjectMenu[] = $state([]);
	private _menubarSnippet: Snippet | null = $state(null);
	private _sidebarActions: {
		onFileClick?: (file: App.Sidebar.FileMetadata) => void;
		onNodeMoved?: (node: App.Sidebar.FileSystemNode, prev_path: string) => void;
		onNewFile?: (file: App.Sidebar.FileMetadata) => void;
		onNewDir?: (dir: App.Sidebar.FileSystemFolder) => void;
		onFileDeleted?: (file: App.Sidebar.FileMetadata) => void;
		onDirDeleted?: (dir: App.Sidebar.FileSystemFolder) => void;
		onPreviewFileChange?: (file: App.Sidebar.FileMetadata) => void;
	} = $state({});
	private _sidebarActive = $state("");
	private _sidebarPreview = $state("");
	private _cache: App.IProjectCache = $state({});

	constructor() {}

	get menu() {
		return this._menu;
	}

	get menubarSnippet() {
		return this._menubarSnippet;
	}

	get sidebarActions() {
		return this._sidebarActions;
	}

	get sidebarActive() {
		return this._sidebarActive;
	}

	get sidebarPreview() {
		return this._sidebarPreview;
	}

	setMenu(menu: App.IProjectMenu[]) {
		this._menu = menu;
	}

	setMenubarSnippet(snippet: Snippet | null) {
		this._menubarSnippet = snippet;
	}

	setSidebarActions(actions: {
		onFileClick?: (file: App.Sidebar.FileMetadata) => void;
		onNodeMoved?: (node: App.Sidebar.FileSystemNode, prev_path: string) => void;
		onNewFile?: (file: App.Sidebar.FileMetadata) => void;
		onNewDir?: (dir: App.Sidebar.FileSystemFolder) => void;
		onFileDeleted?: (file: App.Sidebar.FileMetadata) => void;
		onDirDeleted?: (dir: App.Sidebar.FileSystemFolder) => void;
		onPreviewFileChange?: (file: App.Sidebar.FileMetadata) => void;
	}) {
		this._sidebarActions = actions;
	}

	addSidebarAction(
		action:
			| ((file: App.Sidebar.FileMetadata) => void)
			| ((node: App.Sidebar.FileSystemNode, prev_path: string) => void)
			| ((file: App.Sidebar.FileMetadata) => void)
			| ((dir: App.Sidebar.FileSystemFolder) => void)
			| ((file: App.Sidebar.FileMetadata) => void)
			| ((dir: App.Sidebar.FileSystemFolder) => void)
			| ((file: App.Sidebar.FileMetadata) => void)
	) {
		this._sidebarActions = { ...this._sidebarActions, ...action };
	}

	setSidebarActive(path: string) {
		this._sidebarActive = path;
	}

	setSidebarPreview(path: string) {
		this._sidebarPreview = path;
	}

	tryAddingToCache(key: string, content: string, metadata: App.FileMetadata) {
		if (this._cache[key]) {
			return false;
		}

		this._cache[key] = { content, metadata };
		return true;
	}

	forceAddToCache(key: string, content: string, metadata: App.FileMetadata) {
		this._cache[key] = { content, metadata };
	}
}

const PROJECTSTORE_KEY = Symbol('ProjectStore');

export function createLayoutStore() {
	return setContext(PROJECTSTORE_KEY, new LayoutStore());
}

export function getLayoutStore() {
	return getContext<ReturnType<typeof createLayoutStore>>(PROJECTSTORE_KEY);
}
