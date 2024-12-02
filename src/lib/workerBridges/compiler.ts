import { WorkerBridge } from "./default";

export class CompilerWorkerBridge extends WorkerBridge<App.Compiler.Request, App.Compiler.Response> {
    constructor(worker: Worker) {
        super(worker);
    }

    public init(root: string) {
        super.postMessage({ type: 'init', root } as App.Compiler.InitRequest);
    }

    public compile() {
        super.postMessage({ type: 'compile' } as App.Compiler.CompileRequest);
    }

    public completions(file: string, offset: number) {
        super.postMessage({ type: 'completion', file, offset } as App.Compiler.CompletionRequest);
    }

    public edit(file: string, content: string, offsetStart: number, offsetEnd: number) {
        super.postMessage({ type: 'edit', file, content, offsetStart, offsetEnd } as App.Compiler.EditRequest);
    }

    public add_file(file: string, content: string) {
        super.postMessage({ type: 'add-file', file, content } as App.Compiler.AddFileRequest);
    }

    public onMessage(callback: (message: App.Compiler.Response) => void): void {
        super.onMessageRaw(callback);
    }
}