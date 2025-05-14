import init, { TypstCore, type TypstCoreError, type OutputFormat, type Output } from 'wolframe-typst-core';
import { Result } from '../../functionals';
import * as Comlink from 'comlink';

let core: TypstCore;

type compilerGlobalThis = typeof globalThis & {
    typst_core_utils: {
        fetch?: (url: string) => Uint8Array;
    }
}

function fetch(path: string) {
    const request = new XMLHttpRequest();
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.open('GET', path, false);
    request.send(null);

    if (
        request.status === 200 &&
        (request.response instanceof String || typeof request.response === 'string')
    ) {
        return Uint8Array.from(request.response, (c: string) => c.charCodeAt(0));
    }
    return Uint8Array.from([]);
}

export const Compiler = {
    async initialize(callback: () => void) {
        // Initialize the compiler
        (globalThis as compilerGlobalThis).typst_core_utils = {
            fetch: fetch,
        };

        // Simulate some async operation
        await init();
        core = new TypstCore();

        // Call the callback function when done
        callback();
    },
    addFile(path: string, content: string) {
        core.add_source(path, content);
    },
    removeFile(path: string) {
        core.remove_source(path);
    },
    compile(ok: (result: Output) => void, err: (error: TypstCoreError) => void) {
        try {
            const result = core.compile("svg") as Output;
            ok(result);
        } catch (e) {
            err(e as TypstCoreError);
        }
    },
    setRoot(path: string, err: (error: TypstCoreError) => void) {
        try {
            core.set_root(path);
        } catch (e) {
            err(e as TypstCoreError);
        }
    },
    edit(path: string, content: string, begin: number, end: number, err: (error: TypstCoreError) => void) {
        try {
            core.edit_source(path, content, begin, end);
        } catch (e) {
            err(e as TypstCoreError);
        }
    },
    getFileText(path: string): string {
        try {
            return core.get_source(path);
        } catch (e) {
            console.error(e);
            return "";
        }
    }
};

export type Compiler = typeof Compiler;

export default Compiler;