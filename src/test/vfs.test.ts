import { VFS } from '$lib/stores/vfs.svelte';
import { IndexedDBFileSystem } from '$lib/utils/playground';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const test_logs: string[] = [];

function log(...data: unknown[]) {
    const logMessage = data.map((d) => (typeof d === 'object' ? JSON.stringify(d) : d)).join(' ');
    test_logs.push(logMessage);
}

describe('VFS', () => {
	let cleanupPromise: Promise<void> = Promise.resolve();
	let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });
	const test_logs: string[] = [];
    const vfs = new VFS(new IndexedDBFileSystem());

	beforeEach(async (t) => {
		await cleanupPromise;
		
		consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
			test_logs.push(logMessage);
		});

        log(`Setting up "${t.task.name}"...`);
	});

	afterEach(async (t) => {
		log(`Cleaned up "${t.task.name}".`);
        consoleMock.mockRestore();
        console.info(
            `Test "${t.task.name}" complete. Logs:\n${test_logs.join('\n')}`
        )
        test_logs.length = 0; // Clear the logs for the next test

        cleanupPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 10);
        });
	});


    test('should initialize with no entries (only standard "/main.typ")', async () => {
        await vfs.init();
        expect(vfs.entries.length).toBe(1);
    });

    test('should add a directory', async () => {
        const dir = await vfs.addDir('/testDir');
        expect(dir.file.name).toBe('testDir');
        expect(dir.file.type).toBe('directory');
        expect(vfs.entries.length).toBe(2);
    });

    test('should add a file', async () => {
        const file = await vfs.addFile('/testFile.txt', 'Hello, world!');
        expect(file.file.name).toBe('testFile.txt');
        expect(file.file.type).toBe('file');
        expect(vfs.entries.length).toBe(3);
    });

    test('should delete a file', async () => {
        const file = await vfs.addFile('/testFileToDelete.txt', 'Hello, world!');
        expect(vfs.entries.length).toBe(4);
        const deletedFile = await vfs.deleteFile(file.file.id);
        expect(deletedFile?.file.name).toBe('testFileToDelete.txt');
        expect(vfs.entries.length).toBe(3);
    });

    test('should delete a directory', async () => {
        const dir = await vfs.addDir('/testDirToDelete');
        expect(vfs.entries.length).toBe(4);
        const deletedDir = await vfs.deleteFile(dir.file.id);
        expect(deletedDir?.file.name).toBe('testDirToDelete');
        expect(vfs.entries.length).toBe(3);
    });

    test('should read a file', async () => {
        const file = await vfs.addFile('/testFileToRead.txt', 'Hello, world!');
        const content = await vfs.entries.find((entry) => entry.file.id === file.file.id)?.file.content;
        expect(content).toBe('Hello, world!');
    });

    test('should rename a file', async () => {
        const file = await vfs.addFile('/testFileToRename.txt', 'Hello, world!');
        const renamedFile = await vfs.renameFile(file.file.id, 'renamedFile.txt');
        expect(renamedFile.file.name).toBe('renamedFile.txt');
        expect(vfs.entries.find((entry) => entry.file.id === file.file.id)?.file.name).toBe('renamedFile.txt');
    });

    test('should move a file', async () => {
        const file = await vfs.addFile('/testFileToMove.txt', 'Hello, world!');
        const movedFile = await vfs.moveFile(file.file.id, '/newPath/testFileToMove.txt');
        expect(movedFile.file.path).toBe('/newPath/testFileToMove.txt');
    });
});