import { setContext, getContext } from 'svelte';


export class ProjectStore {
	private _menu: App.IProjectMenu[] = $state([]);
	private _cache: App.IProjectCache = $state({});

	constructor() {}

	get menu() {
		return this._menu;
	}

	setMenu(menu: App.IProjectMenu[]) {
		this._menu = menu;
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

export function createProjectStore() {
	return setContext(PROJECTSTORE_KEY, new ProjectStore());
}

export function getProjectStore() {
	return getContext<ReturnType<typeof createProjectStore>>(PROJECTSTORE_KEY);
}
