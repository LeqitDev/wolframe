import { VFSEntry } from '$lib/stores/vfs.svelte';
import eventController from '.';
import type { IFileSystem } from '../../app.types';

class VFS {
	entries: VFSEntry[] = [];
	private backend: IFileSystem | null = null;

	setBackend(backend: IFileSystem) {
		this.backend = backend;
		backend.init().then(() => {
			eventController.fire('onVFSInitialized');
			this.entries = [];
			backend.listEntries().then((entries) => {
				entries.forEach((file) => {
					this.entries.push(new VFSEntry(file));
				});
				eventController.fire('onVFSFilesUpdated', this.entries);
			});
		});
	}

	addDir(path: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		this.backend.writeFile(path, null).then((dir) => {
			const entry = new VFSEntry(dir);
			this.entries.push(entry);
			eventController.fire('onVFSFilesUpdated', this.entries);
		});
	}

	addFile(path: string, content: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		this.backend.writeFile(path, content).then((file) => {
			const entry = new VFSEntry(file);
			this.entries.push(entry);
			eventController.fire('onVFSFilesUpdated', this.entries);
		});
	}

	deleteFile(id: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		this.backend.deleteFile(id).then(() => {
			const entry = this.entries.find((entry) => entry.file.id === id);
			if (entry === undefined) return;
			this.entries = this.entries.filter((entry) => entry.file.id !== id);
			eventController.fire('onVFSFilesUpdated', this.entries);
		});
	}

	renameFile(id: string, newName: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) throw new Error('File not found');
		entry.file.name = newName;
		this.backend.renameFile(id, newName);
		eventController.fire('onVFSFilesUpdated', this.entries);
	}

	moveFile(id: string, newPath: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		const entry = this.entries.find((entry) => entry.file.id === id);
		if (entry === undefined) throw new Error('File not found');
		entry.file.path = newPath;
		this.backend.moveFile(id, newPath);
		eventController.fire('onVFSFilesUpdated', this.entries);
	}

	getPath(id: string) {
		if (this.backend === null) {
			throw new Error('Backend not set');
		}
		return this.backend.getPath(id);
	}

	getMainFile() {
		return (
			this.entries.find((entry) => entry.file.path === '/main.typ') ??
			this.entries.find((entry) => entry.file.path === '/lib.typ') ??
			this.entries.at(0)
		);
	}

	writeFile(path: string, content: string) {
        if (this.backend === null) {
            throw new Error('Backend not set');
        }
		const entry = this.entries.find((entry) => entry.file.path === path);
		if (entry === undefined) return;
		entry.file.content = content;
		entry.mutated = true;
		this.backend.writeFile(path, content);
	}
}

const vfs: VFS = new VFS();

export default vfs;
