import init, * as typst from '$rust/typst_flow_wasm';

let initialized = false;
let compiler: typst.SuiteCore;

function compile(request: App.Compiler.CompileRequest) {
    const svgs = compiler.compile();
    sendCompileResponse(svgs);
}

function edit(request: App.Compiler.EditRequest) {
    compiler.edit(request.file, request.content, request.offsetStart, request.offsetEnd);
}

function completion(request: App.Compiler.CompletionRequest) {
    const completions = compiler.autocomplete(request.file, request.offset);
    sendCompletionResponse(completions);
}

self.onmessage = async (event: MessageEvent<App.Compiler.Request>) => {
    const request = event.data;

    if (request.type === 'init') {
        if (!initialized) {
            await init();
            compiler = new typst.SuiteCore(request.root);
            initialized = true;
        }
    } else {
        if (!initialized) {
            sendError('Worker not initialized');
            return;
        }

        switch (request.type) {
            case 'compile':
                compile(request);
                break;
            case 'edit':
                edit(request);
                break;
            case 'completion':
                completion(request);
                break;
            default:
                sendError('Unknown request type');
        }
    }
}

function sendError(message: string) {
    self.postMessage({ type: 'error', error: message } as App.Compiler.ErrorResponse);
}

function sendCompileResponse(svgs: string[]) {
    self.postMessage({ type: 'compile', svgs } as App.Compiler.CompileResponse);
}

function sendCompletionResponse(completions: typst.CompletionWrapper[]) {
    self.postMessage({ type: 'completion', completions } as App.Compiler.CompletionResponse);
}