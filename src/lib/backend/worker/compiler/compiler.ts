import init, { TypstCore } from 'wolframe-typst-core';

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
};

export type Compiler = typeof Compiler;

export default Compiler;