import { IndexedDBFileSystem } from '$lib/utils/indexedDBFileSystem';
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { FileType, type IFileSystem } from '../app.types';
import * as idbMod from '$lib/utils/indexedDB';

const mockInitialContent = {
	files: {
		'1': {
			id: '1',
			name: 'main.typ',
			parentId: null,
			isDir: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			path: '/main.typ'
		},
		'2': {
			id: '2',
			name: 'test',
			parentId: null,
			isDir: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			path: '/test'
		},
		'3': {
			id: '3',
			name: 'test2.typ',
			parentId: '2',
			isDir: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			path: '/test/test2.typ'
		}
	},
	blobs: {
		'1': {
			id: '1',
			blob: new Blob(['test'])
		},
		'3': {
			id: '3',
			blob: new Blob(['test'])
		}
	}
};

const mockedOpen = () => {
	return new Promise<void>((resolve) => {
		resolve();
	});
};
const mockedGetAllKeys = () => {
	return new Promise<string[]>((resolve) => {
		resolve(['1', '2', '3']);
	});
};
const mockedGet = (table: string | number | symbol, key: string) => {
	return new Promise<string>((resolve) => {
		// @ts-expect-error Mocking shananigans
		resolve(mockInitialContent[table][key]);
	});
};

vi.mock(import('$lib/utils/indexedDB'), async (originalImport) => {
	const og = await originalImport();

	const IndexedDBAccessor = og.IndexedDBAccessor;

	IndexedDBAccessor.prototype.open = vi.fn(og.IndexedDBAccessor.prototype.open);
	IndexedDBAccessor.prototype.getAllKeys = vi.fn(og.IndexedDBAccessor.prototype.getAllKeys);
	IndexedDBAccessor.prototype.get = vi.fn(og.IndexedDBAccessor.prototype.get);
	IndexedDBAccessor.prototype.delete = vi.fn(og.IndexedDBAccessor.prototype.delete);
	IndexedDBAccessor.prototype.clear = vi.fn(og.IndexedDBAccessor.prototype.clear);
	IndexedDBAccessor.prototype.close = vi.fn(og.IndexedDBAccessor.prototype.close);
	IndexedDBAccessor.prototype.set = vi.fn(og.IndexedDBAccessor.prototype.set);

	return {
		IndexedDBAccessor: IndexedDBAccessor
	};
});

async function initializeIndexedDB(): Promise<IFileSystem> {
	const idbFileSystem = new IndexedDBFileSystem();
	await idbFileSystem.init();
	return idbFileSystem;
}

async function awaitIndexedDBDeletion(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => {
            console.log(`Database ${dbName} deleted successfully`);
            resolve();
        };
        request.onerror = (event) => {
            console.error(`Error deleting database ${dbName}:`, event);
            reject(event);
        };
        request.onblocked = () => {
            console.warn(`Database deletion blocked: ${dbName}`);
            // timeout a reject to avoid blocking forever
            setTimeout(() => {
                reject(new Error(`Database deletion blocked: ${dbName}`));
            }, 10000); // 10 seconds timeout
        };
    });
}

async function purgeIndexedDB() {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
        if (!db.name) continue;
        await awaitIndexedDBDeletion(db.name);
    }
}

// const idbMock = vi.spyOn(mod, 'IndexedDBAccessor').mockImplementation(IndexedDBAccessor);

let cleanupPromise: Promise<void> | null = null;
let idbFileSystem: IFileSystem | null = null;

const test_logs: string[] = [];

function log(...data: unknown[]) {
    const logMessage = data.map((d) => (typeof d === 'object' ? JSON.stringify(d) : d)).join(' ');
    test_logs.push(logMessage);
}

describe('IndexedDBFilesystem - initializing', () => {
    let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });

    beforeEach(async (t) => {
        await cleanupPromise;
        log(`Setting up "${t.task.name}"...`);
        idbFileSystem = await initializeIndexedDB();
        if (!idbFileSystem) {
            throw new Error('Failed to initialize IndexedDB');
        }
        consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
            const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
            test_logs.push(logMessage);
        });
    });

	afterEach(async (t) => {
        await idbFileSystem?.close();
        idbFileSystem = null;
        await purgeIndexedDB();
        cleanupPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 10);
        });
        log(`Cleaned up "${t.task.name}".`);
        consoleMock.mockRestore();
        console.info(
            `Test "${t.task.name}" complete. Logs:\n${test_logs.join('\n')}`
        )
        test_logs.length = 0; // Clear the logs for the next test
	});

	it('empty filesystem', async () => {
        idbFileSystem = idbFileSystem!;
		const files = await idbFileSystem.listEntries();
		expect(files).toHaveLength(1);
		expect(files[0]).toMatchObject({
			content: '',
			name: 'main.typ',
			path: '/main.typ',
			type: FileType.File
		});
	});

	it('filled filesystem', async () => {
		const mockedOpenReturn = vi
			.mocked(idbMod.IndexedDBAccessor.prototype.open)
			.mockImplementation(mockedOpen);
		const mockedGetAllKeysReturn = vi
			.mocked(idbMod.IndexedDBAccessor.prototype.getAllKeys)
			.mockImplementation(mockedGetAllKeys);
		const mockedGetReturn = vi
			.mocked(idbMod.IndexedDBAccessor.prototype.get)
			.mockImplementation(mockedGet);

		const idbFileSystem = await initializeIndexedDB();

		const files = await idbFileSystem.listEntries();
		expect(files).toHaveLength(3);
        await idbFileSystem.close();

		mockedOpenReturn.mockReset();
		mockedGetAllKeysReturn.mockReset();
		mockedGetReturn.mockReset();
	});
});


describe('IndexedDBFileSystem - writeFile, addFile, addDirectory', () => {
	let fs: IFileSystem;
	let cleanupPromise: Promise<void> = Promise.resolve();
	let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });
	const test_logs: string[] = [];

	beforeEach(async (t) => {
		await cleanupPromise;
		
		consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
			test_logs.push(logMessage);
		});

        log(`Setting up "${t.task.name}"...`);
		fs = await initializeIndexedDB();
	});

	afterEach(async (t) => {
		await fs.close();
        await purgeIndexedDB();
        
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

	test('should create a new file with valid content', async () => {
        const path = '/file1.txt';
        const content = 'Hello, world!';
        const file = await fs.writeFile(path, content);
        expect(file).toBeDefined();
        expect(file.type).toBe('file');
        expect(file.content).toBe(content);
    });

	test('should create a new directory when writing null content to a non-existent path', async () => {
        const path = '/newDir';
        const file = await fs.writeFile(path, null);
        expect(file).toBeDefined();
        expect(file.type).toBe('directory');
    });

    test('should throw error when writing null content to an existing file', async () => {
        const path = '/file2.txt';
        // first create the file
        await fs.writeFile(path, 'Initial content');
        await expect(fs.writeFile(path, null)).rejects.toThrowError(/Cannot write null content/);
    });

    test('should update an existing file with new content', async () => {
        const path = '/file3.txt';
        const initialContent = 'First content';
        const updatedContent = 'Updated content';
        const file1 = await fs.writeFile(path, initialContent);
        // Delay to ensure updatedAt changes
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const oldUpdatedAt = file1.updatedAt;
        const file2 = await fs.writeFile(path, updatedContent);
        expect(file2.content).toBe(updatedContent);
        expect(new Date(file2.updatedAt).getTime()).toBeGreaterThan(new Date(oldUpdatedAt).getTime());
    });

    // Edge Case: path with extra separators (if relevant)
    test('should handle path with extra separators', async () => {
        const path = '/nested//file4.txt';
        const content = 'Extra separators test';
        const file = await fs.writeFile(path, content);
        expect(file).toBeDefined();
        expect(file.type).toBe('file');
        expect(file.content).toBe(content);
    });
});

describe('IndexedDBFileSystem - deleteFile', () => {
    let fs: IFileSystem;
    let cleanupPromise: Promise<void> = Promise.resolve();
    let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });
    const test_logs: string[] = [];

    beforeEach(async (t) => {
        await cleanupPromise;
        
        consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
            const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
            test_logs.push(logMessage);
        });

        log(`Setting up "${t.task.name}"...`);
        fs = await initializeIndexedDB();
    });

    afterEach(async (t) => {
        await fs.close();
        await purgeIndexedDB();

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

    test('should delete a file and return it', async () => {
        const path = '/fileToDelete.txt';
        const content = 'This file will be deleted';
        const file = await fs.writeFile(path, content);
        const deletedFile = await fs.deleteFile(file.id);
        expect(deletedFile).toBeDefined();
        expect(deletedFile.path).toBe(file.path);
        expect(deletedFile.content).toBe(content);
    });

    test('should throw error when trying to delete a non-existent file', async () => {
        const id = '7823rhzfzhf74n38923kd9dk23';
        await expect(fs.deleteFile(id)).rejects.toThrowError(/File not found/);
    });

    test('should throw error when trying to delete a non-empty directory', async () => {
        const dirPath = '/dirToDelete';
        const dir = await fs.writeFile(dirPath, null);
        const filePath = '/dirToDelete/fileInDir.txt';
        await fs.writeFile(filePath, 'This file is in a directory');
        await expect(fs.deleteFile(dir.id)).rejects.toThrowError(`Cannot delete non-empty directory: ${dirPath}`);
    });
});

describe('IndexedDBFileSystem - readFile', async () => {
    let fs: IFileSystem;
    let cleanupPromise: Promise<void> = Promise.resolve();
    let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });
    const test_logs: string[] = [];

    beforeEach(async (t) => {
        await cleanupPromise;
        
        consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
            const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
            test_logs.push(logMessage);
        });

        log(`Setting up "${t.task.name}"...`);
        fs = await initializeIndexedDB();
    });

    afterEach(async (t) => {
        await fs.close();
        await purgeIndexedDB();

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

    test('should read the content of an existing file', async () => {
        const path = '/fileToRead.txt';
        const content = 'This is a test file';
        const file = await fs.writeFile(path, content);
        const readContent = await fs.readFile(file.id);
        expect(readContent).toBe(content);
    });

    test('should throw error when trying to read a non-existent file', async () => {
        const id = 'nonExistentId';
        await expect(fs.readFile(id)).rejects.toThrowError(/File not found/);
    });

    test('should throw error when trying to read a directory', async () => {
        const dirPath = '/dirToRead';
        const dir = await fs.writeFile(dirPath, null);
        await expect(fs.readFile(dir.id)).rejects.toThrowError(/Cannot read a directory/);
    });
});

describe('IndexedDBFileSystem - renameFile, moveFile', () => {
    let fs: IFileSystem;
    let cleanupPromise: Promise<void> = Promise.resolve();
    let consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
        const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
        test_logs.push(logMessage);
    });
    const test_logs: string[] = [];

    beforeEach(async (t) => {
        await cleanupPromise;
        
        consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
            const logMessage = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
            test_logs.push(logMessage);
        });

        log(`Setting up "${t.task.name}"...`);
        fs = await initializeIndexedDB();
    });

    afterEach(async (t) => {
        await fs.close();
        await purgeIndexedDB();

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

    test('should rename a file', async () => {
        const file = await fs.writeFile('/rename-test.txt', 'Hello, world!');

        const newName = 'renamed-test.txt';
        const renamedFile = await fs.renameFile(file.id, newName);
        const files = await fs.listEntries();
        expect(files).not.toContain(file);
        expect(file.id).toBe(renamedFile.id);
        const foundFile = files.find((f) => f.id === renamedFile.id);
        expect(foundFile).toBeDefined();
        expect(foundFile?.name).toBe(newName);
    });

    test('should move a file to a new directory', async () => {
        const file = await fs.writeFile('/move-test.txt', 'Hello, world!');
        const dir = await fs.writeFile('/dirToMoveTo', null);

        const newPath = '/dirToMoveTo/moved-test.txt';
        const movedFile = await fs.moveFile(file.id, newPath);
        const files = await fs.listEntries();
        expect(files).not.toContain(file);
        expect(file.id).toBe(movedFile.id);
        const foundFile = files.find((f) => f.id === movedFile.id);
        expect(foundFile).toBeDefined();
        expect(foundFile?.name).toBe('moved-test.txt');
        expect(foundFile?.parentId).toBe(dir.id);
    });
});