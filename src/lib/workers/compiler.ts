import { WASMSection, type Sections } from '$lib/stores/logger.svelte';
import init, * as typst from '$rust/typst_flow_wasm';

type compilerGlobalThis = typeof globalThis & {
    xml_get_sync?: (path: string) => Uint8Array;
    logWasm?: (...e: unknown[]) => void;
    errorWasm?: (...e: unknown[]) => void;
};

let initialized = false;
let compiler: typst.SuiteCore;
let promise: Promise<void>;

function xml_get_sync(path: string) {
    const request = new XMLHttpRequest();
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.open('GET', path, false);
    request.send(null);

    if (
        request.status === 200 &&
        (request.response instanceof String || typeof request.response === 'string')
    ) {
        sendLoggerResponse('info', WASMSection, 'XML GET', path, 'OK');
        return Uint8Array.from(request.response, (c: string) => c.charCodeAt(0));
    }
    sendLoggerResponse('error', WASMSection, 'XML GET', path, 'FAILED');
    return Uint8Array.from([]);
}

function compile() {
    try {
        const svgs = compiler.compile(false);
        sendCompileResponse(svgs);
    } catch (e) {
        const err = e as typst.CompileError[];
        const ret = [] as App.Compiler.CompileErrorType[];

        for (const e of err) {
            ret.push({
                span: {
                    file: e.get_root().get_file_path(),
                    range: e.get_root().get_range(),
                },
                message: e.get_message(),
                severity: e.get_severity(),
                hints: e.get_hints(),
                trace: e.get_trace().map((t) => ({
                    file: t.get_file_path(),
                    range: t.get_range(),
                })),
            });
        }

        sendCompileError(ret);
    }
}

function edit(request: App.Compiler.EditRequest) {
    compiler.edit(request.file, request.content, request.offsetStart, request.offsetEnd);
}

function completion(request: App.Compiler.CompletionRequest) {
    const completions = compiler.autocomplete(request.file, request.offset);

    const items = completions.map((completion) => {
        return {
            label: completion.label(),
            kind: {
                kind: completion.kind().kind.toString(),
                detail: completion.kind().detail
            },
            apply: completion.apply(),
            detail: completion.detail(),
        } as App.Compiler.CompletionItemType;
    });

    sendCompletionResponse(items);
}

function add_file(request: App.Compiler.AddFileRequest) {
    compiler.add_file(request.file, request.content);
}

// Logging functions for use inside WASM TODO: implement inside wasm
function logWasm(...e: unknown[]) {
    sendLoggerResponse('info', WASMSection, ...e);
}

function errorWasm(...e: unknown[]) {
    sendLoggerResponse('error', WASMSection, ...e);
}

self.onmessage = async (event: MessageEvent<App.Compiler.Request>) => {
    const request = event.data;

    if (request.type === 'init') {
        if (!initialized) {
            (globalThis as compilerGlobalThis).xml_get_sync = xml_get_sync;
            (globalThis as compilerGlobalThis).logWasm = logWasm;
            (globalThis as compilerGlobalThis).errorWasm = errorWasm;
            // Instantiate a promise to wait for the WASM module to be loaded
            promise = new Promise((resolve) => {
                // loop until the WASM module is loaded
                const interval = setInterval(() => {
                    if (initialized) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });

            await init();
            compiler = new typst.SuiteCore(request.root);
            initialized = true;
            sendLoggerResponse('info', WASMSection, 'Worker initialized');
        }
    } else {
        if (!initialized && !promise) {
            sendError('Worker not initialized');
            return;
        } else if (!initialized) {
            await promise;
        }

        switch (request.type) {
            case 'compile':
                compile();
                break;
            case 'edit':
                edit(request);
                break;
            case 'completion':
                completion(request);
                break;
            case 'add-file':
                add_file(request);
                break;
            default:
                sendError('Unknown request type');
        }
    }
}

function sendError(message: string) {
    self.postMessage({ type: 'error', sub: 'default', error: message } as App.Compiler.DefaultErrorResponse);
}

function sendCompileError(errors: App.Compiler.CompileErrorType[]) {
    self.postMessage({ type: 'error', sub: 'compile', errors } as App.Compiler.CompileErrorResponse);
}

function sendCompileResponse(svgs: string[]) {
    self.postMessage({ type: 'compile', svgs } as App.Compiler.CompileResponse);
}

function sendCompletionResponse(completions: App.Compiler.CompletionItemType[]) {
    self.postMessage({ type: 'completion', completions } as App.Compiler.CompletionResponse);
}

function sendLoggerResponse(severity: 'error' | 'warn' | 'info', section: Sections, ...message: unknown[]) {
    self.postMessage({ type: 'logger', severity, section, message } as App.Compiler.LoggerResponse);
}