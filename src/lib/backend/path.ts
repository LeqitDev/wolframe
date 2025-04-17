const PATH_SEPARATOR = '/';

export class Path {
    private parts: string[] = [];

    /* 
     * Create a new Path instance from a string.
     * @param path - The path string to parse.
     * @throws Error if the path is empty or invalid.
     */
    constructor(path: string) {
        if (path.length === 0) {
            throw new Error('Path is empty.');
        }

        // Remove leading and trailing separators
        const trimmedPath = path.replace(/^[\/\\]+/, '')
                                .replace(/[\/\\]+$/, '');
        if (trimmedPath.length === 0) {
            throw new Error('Path is empty after trimming.');
        }

        // Split the path into parts using the regex
        const parsedPath = path.replaceAll(/[\/\\]+/g, '/')
                                .replaceAll(/[\/\\]+/g, '/');
        this.parts = parsedPath.split(PATH_SEPARATOR).filter(part => part.length > 0);
    }

    /* 
     * Get the path as a string without a leading separator.
     * @returns The path as a string without a leading separator.
     */
    rootless(): string {
        return this.parts.join(PATH_SEPARATOR);
    }

    /* 
     * Get the path as a string with a leading separator.
     * @returns The path as a string with a leading separator.
     */
    rooted(): string {
        return PATH_SEPARATOR + this.rootless();
    }

    /* 
     * Get the path as a string.
     * @returns The path as a string.
     */
    toString(): string {
        return this.rootless();
    }

    /*
     * Get the last part of the path.
     * @returns The last part of the path.
     */
    name(): string {
        return this.parts[this.parts.length - 1];
    }

    /* 
     * Get the parent path of this path.
     * @returns The parent path or null if this path has no parent.
     */
    parent(): Path | null {
        if (this.parts.length <= 1) {
            return null;
        }
        const parentParts = this.parts.slice(0, -1);
        return new Path(parentParts.join(PATH_SEPARATOR));
    }

    /* 
     * Check if this path is equal to another path.
     * @param other - The other path to compare with.
     * @returns true if the paths are equal, false otherwise.
     */
    equals(other: Path | string): boolean {
        if (typeof other === 'string') {
            return this.equals(new Path(other));
        }
        console.log('Comparing paths:', this.rootless(), other.rootless());
        if (this.parts.length !== other.parts.length) {
            return false;
        }
        for (let i = 0; i < this.parts.length; i++) {
            if (this.parts[i] !== other.parts[i]) {
                return false;
            }
        }
        return true;
    }

    /* 
     * Append a part to the path.
     * @param part - The part to append.
     * @returns A new Path instance with the appended part.
     */
    append(part: string): Path {
        if (part.length === 0) {
            return this;
        }
        const path = new Path(part);
        const newParts = [...this.parts, ...path.parts];
        return new Path(newParts.join(PATH_SEPARATOR));
    }
}

if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest;

    test('Path: constructor', () => {
        expect(() => new Path('')).toThrow('Path is empty.');
        expect(() => new Path('/')).toThrow('Path is empty after trimming.');
        expect(() => new Path('///')).toThrow('Path is empty after trimming.');
        expect(() => new Path('abc/def')).not.toThrow();
        expect(() => new Path('/abc/def')).not.toThrow();
        expect(() => new Path('\\abc\\def')).not.toThrow();
        expect(() => new Path('//////abc\\\\\\\\def//lol/')).not.toThrow();
    });

    test('Path: rootless', () => {
        expect(new Path('abc/def').rootless()).toBe('abc/def');
        expect(new Path('/abc/def').rootless()).toBe('abc/def');
        expect(new Path('\\abc\\def').rootless()).toBe('abc/def');
        expect(new Path('//////abc\\\\\\\\def//lol/').rootless()).toBe('abc/def/lol');
    });

    test('Path: rooted', () => {
        expect(new Path('abc/def').rooted()).toBe('/abc/def');
        expect(new Path('/abc/def').rooted()).toBe('/abc/def');
        expect(new Path('\\abc\\def').rooted()).toBe('/abc/def');
        expect(new Path('//////abc\\\\\\\\def//lol/').rooted()).toBe('/abc/def/lol');
    });

    test('Path: name', () => {
        expect(new Path('abc/def').name()).toBe('def');
        expect(new Path('/abc/def').name()).toBe('def');
        expect(new Path('\\abc\\def').name()).toBe('def');
        expect(new Path('//////abc\\\\\\\\def//lol/').name()).toBe('lol');
    });

    test('Path: parent', () => {
        expect(new Path('abc/def').parent()?.rootless()).toBe('abc');
        expect(new Path('/abc/def').parent()?.rootless()).toBe('abc');
        expect(new Path('\\abc\\def').parent()?.rootless()).toBe('abc');
        expect(new Path('//////abc\\\\\\\\def//lol/').parent()?.rootless()).toBe('abc/def');
        expect(new Path('/abc').parent()).toBe(null);
    });

    test('Path: equals', () => {
        expect(new Path('abc/def').equals(new Path('abc/def'))).toBe(true);
        expect(new Path('/abc/def').equals('abc/def')).toBe(true);
        expect(new Path('\\abc\\def').equals(new Path('abc/def'))).toBe(true);
        expect(new Path('//////abc\\\\\\\\def//lol/').equals(new Path('abc/def/lol'))).toBe(true);
    });
}