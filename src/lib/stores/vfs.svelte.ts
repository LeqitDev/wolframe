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
		const files = await this.fileSystem.listEntries();

		files.forEach((file) => {
			this.entries.push(new VFSEntry(file));
		});
	}

	async addDir(path: string) {
		const dir = await this.fileSystem.writeFile(path, null);
		const entry = new VFSEntry(dir);
		this.entries.push(entry);
		return entry;
	}

	async addFile(path: string, content: string) {
		console.log('Adding file', path);
		const file = await this.fileSystem.writeFile(path, content);
		const entry = new VFSEntry(file);
		this.entries.push(entry);
		return entry;
	}

	async deleteFile(id: string) {
		console.log('Deleting file', id);
		await this.fileSystem.deleteFile(id);
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) return;
		this.entries = this.entries.filter((entry) => entry.file.id !== id);
		return entry;
	}

	fileMutated(id: string) {
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) return;
		entry.mutated = true;
	}

	openFile(id: string) {
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) return;
		const possibleDuplicates = this.currentlyOpen.filter((entry) => entry.file.name === entry.file.name && entry.file.path !== id);
		if (possibleDuplicates.length > 0) {
			possibleDuplicates.forEach((entry) => {
				entry.open.hasDuplicates = true;
			});
			entry.open.hasDuplicates = true;
		}
		entry.open.isOpen = true;
		this.openHistory = [id, ...this.openHistory.filter((p) => p !== id)];
		if (this.currentlyOpen.findIndex((entry) => entry.file.id === id) === -1) {
			if (!entry.mutated) {
				for (const entry of this.entries.filter((entry) => entry.file.id !== id && entry.open.isOpen)) {
					if (!entry.mutated) {
						this.closeFile(entry.file.id);
					}
				}
			}
			this.currentlyOpen.push(entry)
			console.log('Pushing opening file', id, $state.snapshot(this.currentlyOpen));
		}
	}

	renameFile(id: string, newName: string) {
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) throw new Error('File not found');
		entry.file.name = newName;
		this.fileSystem.renameFile(id, newName);
		return entry;
	}

	moveFile(id: string, newPath: string) {
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) throw new Error('File not found');
		entry.file.path = newPath;
		this.fileSystem.moveFile(id, newPath);
		return entry;
	}

	closeFile(id: string) {
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) return;
		if (entry.open.hasDuplicates) {
			const duplicates = this.currentlyOpen.filter((entry) => entry.file.name === entry.file.name);
			if (duplicates.length === 1) {
				duplicates[0].open.hasDuplicates = false;
			}
		}
		entry.open.isOpen = false;
		this.openHistory = this.openHistory.filter((i) => i !== id);
		this.currentlyOpen = this.currentlyOpen.filter((entry) => entry.file.id !== id);
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
			const filename = entry.file.name;
			if (!groups.has(filename)) groups.set(filename, []);
			groups.get(filename)!.push(entry);
		});

		// 3. Process each group
		groups.forEach((entries, filename) => {
			console.log('Processing group', filename, entries);
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
