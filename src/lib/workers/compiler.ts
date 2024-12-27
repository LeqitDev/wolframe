import { getUniLogger, WASMSection, type Sections } from '$lib/stores/logger.svelte';
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
        const err = (e as typst.Diagnostics[]).map((e) => e.to_json()) as typst.Diagnostics[];

        sendCompileError(err);
    }
}

function edit(request: App.Compiler.EditRequest) {
    compiler.edit(request.file, request.content, request.offsetStart, request.offsetEnd);
}

function completion(request: App.Compiler.CompletionRequest) {
    const completions = compiler.autocomplete(request.file, request.offset);

    sendCompletionResponse(completions.map((completion) => completion.to_json()));
}

function definition(request: App.Compiler.DefinitionRequest) {
    let definition: typst.Definition | undefined = compiler.definition(request.file, request.offset);

    if (definition) {
        getUniLogger().info('worker/compiler', 'Definition found', definition);
        sendDefinitionResponse(definition.to_json());
    } else {
        sendLoggerResponse('info', WASMSection, 'Definition not found');
    }
}

function add_file(request: App.Compiler.AddFileRequest) {
    compiler.add_file(request.file, request.content);
}

async function collect_imports() {
    const preview = await fetch('https://packages.typst.org/preview/index.json');
    const previewJson = await preview.json();

    const wolframePackages = await fetch('/packages/index');
    const wolframeJson = await wolframePackages.json();

    const previewImports = [] as typst.RawPackageSpec[];

    for (const pkg of wolframeJson) {
        previewImports.push(new typst.RawPackageSpec(`wolframe-${pkg.uname}`, pkg.name, pkg.version, pkg.description));
    }

    for (const pkg of previewJson) {
        previewImports.push(new typst.RawPackageSpec("preview", pkg.name, pkg.version, pkg.description));
    }

    logWasm('Adding preview packages to compiler', previewImports);

    compiler.add_packages(previewImports);
}

// Logging functions for use inside WASM TODO: implement inside wasm
function logWasm(...e: unknown[]) {
    sendLoggerResponse('info', WASMSection, ...e);
}

function warnWasm(...e: unknown[]) {
    sendLoggerResponse('warn', WASMSection, ...e);
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
            collect_imports();
            initialized = true;
            sendLoggerResponse('info', WASMSection, 'Worker initialized');
        }
    } else {
        if (!initialized && !promise) {
            warnWasm('Worker not initialized');
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
            case 'move':
                compiler.move_file(request.old_path, request.new_path);
                break;
            case 'completion':
                completion(request);
                break;
            case 'definition':
                definition(request);
                break;
            case 'add-file':
                add_file(request);
                break;
            case 'set-root':
                logWasm('Setting root', request.root);
                compiler.set_root(request.root);
                break;
            case 'print-files':
                sendLoggerResponse("info", WASMSection, compiler.get_files());
                break;
            default:
                sendError('Unknown request type');
        }
    }
}

function sendError(message: string) {
    self.postMessage({ type: 'error', sub: 'default', error: message } as App.Compiler.DefaultErrorResponse);
}

function sendCompileError(errors: typst.Diagnostics[]) {
    self.postMessage({ type: 'error', sub: 'compile', errors } as App.Compiler.CompileErrorResponse);
}

function sendCompileResponse(svgs: string[]) {
    self.postMessage({ type: 'compile', svgs } as App.Compiler.CompileResponse);
}

function sendCompletionResponse(completions: typst.Completion[]) {
    self.postMessage({ type: 'completion', completions } as App.Compiler.CompletionResponse);
}

function sendDefinitionResponse(definition: typst.Definition) {
    self.postMessage({ type: 'definition', definition} as App.Compiler.DefinitionResponse);
}

function sendLoggerResponse(severity: 'error' | 'warn' | 'info', section: Sections, ...message: unknown[]) {
    self.postMessage({ type: 'logger', severity, section, message } as App.Compiler.LoggerResponse);
}