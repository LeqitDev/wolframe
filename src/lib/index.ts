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