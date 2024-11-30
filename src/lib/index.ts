// place files you want to import through the `$lib` alias in this folder.

/* 
 * Worker bridge
 */

class WorkerBridge {
    private worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
    }

    postMessageRawTransfer<T>(message: T, transfer: Transferable[]) {
        this.worker.postMessage(message, transfer);
    }

    postMessageRaw<T>(message: T, options?: StructuredSerializeOptions) {
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

    public cachedRerender(pageId: number, svg: string) {
        super.postMessageRaw<App.PageRenderer.Request>({ pageId, type: 'render', svg, recompile: false });
    }

    public forcedRerender(pageId: number, svg: string, canvas?: OffscreenCanvas) {
        if (canvas) {
            super.postMessageRawTransfer<App.PageRenderer.Request>({ pageId, type: 'render', svg, canvas, recompile: true }, [canvas]);
        } else {
            super.postMessageRaw<App.PageRenderer.Request>({ pageId, type: 'render', svg, recompile: true });
        }
    }

    public resize(pageId: number, width: number, height: number, preserveAspectRatio?: boolean | string) {
        super.postMessageRaw<App.PageRenderer.Request>({ pageId, type: 'resize', width, height, preserveAspectRatio });
    }

    public onMessage(callback: (message: App.PageRenderer.Response) => void): void {
        super.onMessageRaw<App.PageRenderer.Response>(callback);
    }
}