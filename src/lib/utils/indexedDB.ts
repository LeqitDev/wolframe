
type Builder = {
    [version: number]: (db: IDBDatabase) => void;
}

export class IndexedDBAccessor<T, K extends keyof T = keyof T> {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private dbVersion: number;
    private builder: Builder;

    constructor(dbName: string, dbVersion: number, builder: Builder) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.builder = builder;
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
            request.onupgradeneeded = (e) => {
                const db = request.result;
                const highestBuilderVersion = Math.max(...Object.keys(this.builder).map(Number));
                console.log(`Upgrading database from version ${e.oldVersion} to version ${e.newVersion ?? highestBuilderVersion}`);
                for (let i = e.oldVersion + 1; i <= (e.newVersion ?? highestBuilderVersion); i++) {
                    console.log(`Running builder for version ${i}`);
                    this.builder[i](db);
                }
            };
        });
    }

    async get<K extends keyof T>(storeName: K, key: string): Promise<T[K] | null> {
        if (this.db === null) {
            await this.open();
        }
        return new Promise((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(storeName.toString(), "readonly");
            const store = transaction.objectStore(storeName.toString());
            const request = store.get(key);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }

    async set(storeName: K, value: T[K]) {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error(`Database not open`));
                return;
            }
            const transaction = this.db.transaction(storeName.toString(), "readwrite");
            const store = transaction.objectStore(storeName.toString());
            const request = store.put(value);
            request.onerror = () => {
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve();
            };
        });
    }

    async delete(storeName: K, key: string) {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(storeName.toString(), "readwrite");
            const store = transaction.objectStore(storeName.toString());
            const request = store.delete(key);
            request.onerror = () => {
                console.error("Error deleting", key, request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                console.log("Deleted", key);
                resolve();
            };
        });
    }

    async clear(storeName: K) {
        return new Promise<void>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(storeName.toString(), "readwrite");
            const store = transaction.objectStore(storeName.toString());
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

    async getAllKeys(storeName: K) {
        if (this.db === null) {
            await this.open();
        }
        return new Promise<string[]>((resolve, reject) => {
            if (this.db === null) {
                reject(new Error("Database not open"));
                return;
            }
            const transaction = this.db.transaction(storeName.toString(), "readonly");
            const store = transaction.objectStore(storeName.toString());
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