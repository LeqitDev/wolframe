import { untrack } from "svelte";

export class VFSEntry implements App.FileEntry {
	path: string;
	content: string;
	open = $state(false);
	mutated = $state(false);

	constructor(path: string, content: string) {
		this.path = path;
		this.content = content;
	}
}

type OpenFileEntry = VFSEntry & {
	display: {
		name: string;
		prefix: string;
	};
};

export class VFS {
	entries: VFSEntry[] = $state([]);
	openHistory: string[] = $state([]);
	fileSystem: App.VFS.FileSystem;

	constructor(fileSystem: App.VFS.FileSystem) {
		this.fileSystem = fileSystem;
	}

	async init() {
		await this.fileSystem.init();
		const files = await this.fileSystem.listFiles();
		Object.entries(files).forEach(([path, content]) => {
			this.addFile(path, content);
		});
	}

	addFile(path: string, content: string) {
		console.log('Adding file', path);
		this.entries.push(new VFSEntry(path, content));
	}

	deleteFile(path: string) {
		this.entries = this.entries.filter((entry) => entry.path !== path);
	}

	fileMutated(path: string) {
		const entry = this.entries.find((entry) => entry.path === path);
		if (entry === undefined) return;
		entry.mutated = true;
	}

	openFile(path: string) {
		const entry = this.entries.find((entry) => entry.path === path);
		if (entry === undefined) return;
		entry.open = true;
		this.openHistory = [path, ...this.openHistory.filter((p) => p !== path)];
	}

	closeFile(path: string) {
		const entry = this.entries.find((entry) => entry.path === path);
		if (entry === undefined) return;
		entry.open = false;
		this.openHistory = this.openHistory.filter((p) => p !== path);
		return this.openHistory[0];
	}

	getMainFile() {
		return untrack(() => {
			return this.entries.find((entry) => entry.path === '/main.typ') ?? (this.entries.find((entry) => entry.path === '/lib.typ') ?? this.entries.at(0));
		})
	}

	get openedFiles() {
		const openFiles: OpenFileEntry[] = [];

		// 1. Collect opened entries
		const openedEntries = this.entries.filter((entry) => entry.open);

		// 2. Group by filename
		const groups = new Map<string, VFSEntry[]>();
		openedEntries.forEach((entry) => {
			const filename = entry.path.split('/').pop() || '';
			if (!groups.has(filename)) groups.set(filename, []);
			groups.get(filename)!.push(entry);
		});

		// 3. Process each group
		groups.forEach((entries, filename) => {
			if (entries.length === 1) {
				// Single file - use simple display
				openFiles.push({
					...entries[0],
					display: {
						name: filename,
						prefix: ''
					}
				});
			} else {
				// Multiple files - need prefixes
				entries.forEach((entry) => {
					const segments = entry.path.split('/');
					const name = segments.pop()!;
					const prefix =
						(segments.length > 1 ? '.../' : '/') + (segments.pop() || '').replace('files', '');

					openFiles.push({
						...entry,
						display: {
							name,
							prefix
						}
					});
				});
			}
		});

		return openFiles;
	}
}
