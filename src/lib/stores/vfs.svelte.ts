import { untrack } from "svelte";
import type { IFileSystem, File } from "../../app.types";

export class VFSEntry {
	open = $state({
		isOpen: false,
		hasDuplicates: false
	});
	mutated = $state(false);
	file: File;

	constructor(file: File) {
		this.file = file;
	}

	getParentName() {
		const segments = this.file.path.split('/');
		segments.pop();
		return segments.pop() || '';
	}
}

type OpenFileEntry = VFSEntry & {
	display: {
		name: string;
		prefix: string;
	};
	getParentName: () => string;
};

export class VFS {
	entries: VFSEntry[] = $state([]);
	openHistory: string[] = $state([]);
	currentlyOpen: VFSEntry[] = $state([]);
	private fileSystem: IFileSystem;

	constructor(fileSystem: IFileSystem) {
		this.fileSystem = fileSystem;
	}

	async init() {
		await this.fileSystem.init();
		const files = await this.fileSystem.listFiles();

		files.forEach((file) => {
			this.entries.push(new VFSEntry(file));
		});
	}

	addDir(path: string) {
		this.fileSystem.addDirectory(path).then((file) => {
			this.entries.push(new VFSEntry(file));
		})
	}

	addFile(path: string, content: string) {
		console.log('Adding file', path);
		this.fileSystem.writeFile(path, content).then((file) => {
			this.entries.push(new VFSEntry(file));
		});
	}

	deleteFile(path: string) {
		console.log('Deleting file', path);
		this.fileSystem.deleteFile(path).then(() => {
			this.entries = this.entries.filter((entry) => entry.file.path !== path);
		});
	}

	fileMutated(path: string) {
		const entry = this.entries.find((entry) => entry.file.path === path);
		if (entry === undefined) return;
		entry.mutated = true;
	}

	openFile(path: string) {
		const entry = this.entries.find((entry) => entry.file.path === path);
		if (entry === undefined) return;
		const possibleDuplicates = this.currentlyOpen.filter((entry) => entry.file.name === entry.file.name && entry.file.path !== path);
		if (possibleDuplicates.length > 0) {
			possibleDuplicates.forEach((entry) => {
				entry.open.hasDuplicates = true;
			});
			entry.open.hasDuplicates = true;
		}
		entry.open.isOpen = true;
		this.openHistory = [path, ...this.openHistory.filter((p) => p !== path)];
		if (this.currentlyOpen.findIndex((entry) => entry.file.path === path) === -1) {
			if (!entry.mutated) {
				for (const entry of this.entries.filter((entry) => entry.file.path !== path && entry.open.isOpen)) {
					if (!entry.mutated) {
						this.closeFile(entry.file.path);
					}
				}
			}
			this.currentlyOpen.push(entry)
		}
	}

	closeFile(path: string) {
		const entry = this.entries.find((entry) => entry.file.path === path);
		if (entry === undefined) return;
		if (entry.open.hasDuplicates) {
			const duplicates = this.currentlyOpen.filter((entry) => entry.file.name === entry.file.name);
			if (duplicates.length === 1) {
				duplicates[0].open.hasDuplicates = false;
			}
		}
		entry.open.isOpen = false;
		this.openHistory = this.openHistory.filter((p) => p !== path);
		this.currentlyOpen = this.currentlyOpen.filter((entry) => entry.file.path !== path);
		return this.openHistory[0];
	}

	getMainFile() {
		return untrack(() => {
			return this.entries.find((entry) => entry.file.path === '/main.typ') ?? (this.entries.find((entry) => entry.file.path === '/lib.typ') ?? this.entries.at(0));
		})
	}

	writeFile(path: string, content: string) {
		const entry = this.entries.find((entry) => entry.file.path === path);
		if (entry === undefined) return;
		entry.file.content = content;
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
			const filename = entry.file.path.split('/').pop() || '';
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
					getParentName: entries[0].getParentName
				});
			} else {
				// Multiple files - need prefixes
				entries.forEach((entry) => {
					const segments = entry.file.path.split('/');
					const name = segments.pop()!;
					const prefix =
						(segments.length > 1 ? '.../' : '/') + (segments.pop() || '').replace('files', '');

					openFiles.push({
						...entry,
						display: {
							name,
							prefix
						},
						getParentName: entries[0].getParentName
					});
				});
			}
		});

		return openFiles;
	}
}
