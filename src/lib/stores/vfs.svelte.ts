import { untrack } from "svelte";
import type { IFileSystem } from "../../app.types";

export class VFSEntry implements App.FileEntry {
	path: string;
	content: string = '';
	open = $state({
		isOpen: false,
		hasDuplicates: false
	});
	mutated = $state(false);
	type: "file" | "dir" = "file";

	constructor(path: string, type?: "file" | "dir") {
		this.path = path;
		if (type) this.type = type;
	}

	isDir() {
		return this.type === 'dir';
	}

	getName() {
		return this.path.split('/').pop() || '';
	}

	getParent() {
		const segments = this.path.split('/');
		segments.pop();
		return segments.pop() || '';
	}
}

type OpenFileEntry = VFSEntry & {
	display: {
		name: string;
		prefix: string;
	};
	isDir: () => boolean;
	getName: () => string;
	getParent: () => string;
};

export class VFS {
	entries: VFSEntry[] = $state([]);
	openHistory: string[] = $state([]);
	currentlyOpen: VFSEntry[] = $state([]);
	fileSystem: IFileSystem;

	constructor(fileSystem: IFileSystem) {
		this.fileSystem = fileSystem;
	}

	async init() {
		await this.fileSystem.init();
		const files = await this.fileSystem.listFiles();

		files.forEach((file, path) => {
			if (file.isDir) {
				this.addDir(path);
			} else {
				this.addFile(path, file.content ?? "");
			}
		});
	}

	addDir(path: string) {
		this.entries.push(new VFSEntry(path, "dir"));
	}

	addFile(path: string, content: string) {
		console.log('Adding file', path);
		const file = new VFSEntry(path);
		file.content = content;
		this.entries.push(file);
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
		const possibleDuplicates = this.currentlyOpen.filter((entry) => entry.getName() === entry.getName() && entry.path !== path);
		if (possibleDuplicates.length > 0) {
			possibleDuplicates.forEach((entry) => {
				entry.open.hasDuplicates = true;
			});
			entry.open.hasDuplicates = true;
		}
		entry.open.isOpen = true;
		this.openHistory = [path, ...this.openHistory.filter((p) => p !== path)];
		if (this.currentlyOpen.findIndex((entry) => entry.path === path) === -1) {
			if (!entry.mutated) {
				for (const entry of this.entries.filter((entry) => entry.path !== path && entry.open.isOpen)) {
					if (!entry.mutated) {
						this.closeFile(entry.path);
					}
				}
			}
			this.currentlyOpen.push(entry)
		}
	}

	closeFile(path: string) {
		const entry = this.entries.find((entry) => entry.path === path);
		if (entry === undefined) return;
		if (entry.open.hasDuplicates) {
			const duplicates = this.currentlyOpen.filter((entry) => entry.getName() === entry.getName());
			if (duplicates.length === 1) {
				duplicates[0].open.hasDuplicates = false;
			}
		}
		entry.open.isOpen = false;
		this.openHistory = this.openHistory.filter((p) => p !== path);
		this.currentlyOpen = this.currentlyOpen.filter((entry) => entry.path !== path);
		return this.openHistory[0];
	}

	getMainFile() {
		return untrack(() => {
			return this.entries.find((entry) => entry.path === '/main.typ') ?? (this.entries.find((entry) => entry.path === '/lib.typ') ?? this.entries.at(0));
		})
	}

	writeFile(path: string, content: string) {
		const entry = this.entries.find((entry) => entry.path === path);
		if (entry === undefined) return;
		entry.content = content;
		entry.mutated = true;
		this.fileSystem.writeFile(path, content);
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
					},
					isDir: entries[0].isDir,
					getName: entries[0].getName,
					getParent: entries[0].getParent
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
						},
						isDir: entry.isDir,
						getName: entry.getName,
						getParent: entry.getParent
					});
				});
			}
		});

		return openFiles;
	}
}
