export class IndexedDBAccessor<T> {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private dbVersion: number;
    private storeName: string;

    constructor(dbName: string, dbVersion: number, storeName: string) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.storeName = storeName;
    }

    async open() {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore(this.storeName);
            };
        });
    }

    async get(key: string): Promise<T | null> {
        if (this.db === null) {
            await this.open();
        }
        return new Promise((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }

    async set(key: string, value: T) {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.put(value, key);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve();
            };
        });
    }

    async delete(key: string) {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve();
            };
        });
    }

    async clear() {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve();
            };
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async getAllKeys() {
        if (this.db === null) {
            await this.open();
        }
        return new Promise<string[]>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve(request.result as string[]);
            };
        });
    }
}