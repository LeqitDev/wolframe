interface FileStorageOptions {
	dbName?: string;
	storeName?: string;
}

export class IndexedDBFileStorage {
	private dbName: string;
	private storeName: string;
	private db: IDBDatabase | null = null;

	constructor(options: FileStorageOptions = {}) {
		this.dbName = options.dbName || 'FileStorageDB';
		this.storeName = options.storeName || 'files';
	}

	private async openDB(): Promise<IDBDatabase> {
		if (this.db) return this.db;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName, { keyPath: 'name' });
				}
			};

			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				resolve(this.db);
			};

			request.onerror = (event) => {
				reject(new Error(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error}`));
			};
		});
	}

	private getTransaction(mode: IDBTransactionMode = 'readwrite'): Promise<IDBObjectStore> {
		return this.openDB().then((db) =>
			db.transaction(this.storeName, mode).objectStore(this.storeName)
		);
	}

	async saveFile(file: File | Blob, name?: string): Promise<string> {
		const fileName = name || file.name;
		const fileData = await file.arrayBuffer();

		const store = await this.getTransaction();
		return new Promise((resolve, reject) => {
			const request = store.put({
				name: fileName,
				data: fileData,
				type: file.type,
				lastModified: file instanceof File ? file.lastModified : Date.now()
			});

			request.onsuccess = () => resolve(fileName);
			request.onerror = () => reject(new Error('Failed to save file'));
		});
	}

	async retrieveFile(fileName: string): Promise<File | null> {
		const store = await this.getTransaction('readonly');
		return new Promise((resolve, reject) => {
			const request = store.get(fileName);

			request.onsuccess = (event) => {
				const result = (event.target as IDBRequest).result;
				if (!result) {
					resolve(null);
					return;
				}

				const file = new File([result.data], result.name, {
					type: result.type,
					lastModified: result.lastModified
				});
				resolve(file);
			};

			request.onerror = () => reject(new Error('Failed to retrieve file'));
		});
	}

	async deleteFile(fileName: string): Promise<void> {
		const store = await this.getTransaction();
		return new Promise((resolve, reject) => {
			const request = store.delete(fileName);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(new Error('Failed to delete file'));
		});
	}

	async listFiles(): Promise<string[]> {
		const store = await this.getTransaction('readonly');
		return new Promise((resolve, reject) => {
			const request = store.getAllKeys();

			request.onsuccess = (event) => {
				const fileNames = (event.target as IDBRequest).result as string[];
				resolve(fileNames);
			};

			request.onerror = () => reject(new Error('Failed to list files'));
		});
	}

    syncRetrieveFile(fileName: string): File | null {
        let file: File | null = null;
        this.retrieveFile(fileName).then((f) => file = f);
        while (file === null) {wait(100);}
        return file;
    }
}

function wait(ms) {
    let start = Date.now(),
        now = start;
    while (now - start < ms) {
      now = Date.now();
    }
}