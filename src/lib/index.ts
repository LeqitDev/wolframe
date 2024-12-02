// place files you want to import through the `$lib` alias in this folder.

/* 
 * Worker bridge
 */

class WorkerBridge {
    private worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
    }

    postMessage<T>(message: T, options?: StructuredSerializeOptions) {
        this.worker.postMessage(message, options);
    }

    onMessageRaw<T>(callback: (message: T) => void) {
        this.worker.onmessage = (event) => {
            callback(event.data);
        };
    }
}

export class PageRendererWorkerBridge extends WorkerBridge {
    constructor(worker: Worker) {
        super(worker);
    }

    public update(pageId: number, maxWidth: number) {
        super.postMessage<App.PageRenderer.Request>({ pageId, type: 'update', maxWidth });
    }

    public rerender(pageId: number, svg: string, cachedSvg: boolean = false) {
        super.postMessage<App.PageRenderer.Request>({ pageId, type: 'render', svg, cached: cachedSvg });
    }

    public resize(pageId: number, zoom: number) {
        super.postMessage<App.PageRenderer.Request>({ pageId, type: 'resize', zoom });
    }

    public delete(pageId: number) {
        super.postMessage<App.PageRenderer.Request>({ pageId, type: 'delete' });
    }

    public onMessage(callback: (message: App.PageRenderer.Response) => void): void {
        super.onMessageRaw<App.PageRenderer.Response>(callback);
    }
}

export class CompilerWorkerBridge extends WorkerBridge {
    constructor(worker: Worker) {
        super(worker);
    }

    public init(root: string) {
        super.postMessage<App.Compiler.InitRequest>({ type: 'init', root });
    }

    public compile() {
        super.postMessage<App.Compiler.CompileRequest>({ type: 'compile' });
    }

    public completions(file: string, offset: number) {
        super.postMessage<App.Compiler.CompletionRequest>({ type: 'completion', file, offset });
    }

    public edit(file: string, content: string, offsetStart: number, offsetEnd: number) {
        super.postMessage<App.Compiler.EditRequest>({ type: 'edit', file, content, offsetStart, offsetEnd });
    }

    public add_file(file: string, content: string) {
        super.postMessage<App.Compiler.AddFileRequest>({ type: 'add-file', file, content });
    }

    public onMessage(callback: (message: App.Compiler.Response) => void): void {
        super.onMessageRaw<App.Compiler.Response>(callback);
    }
}