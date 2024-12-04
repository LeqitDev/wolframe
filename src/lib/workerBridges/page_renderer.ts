import { WorkerBridge } from './default';

export class PageRendererWorkerBridge extends WorkerBridge<App.PageRenderer.Request, App.PageRenderer.Response> {
    constructor(worker: Worker) {
        super(worker);
    }

    public update(pageId: number, maxWidth: number) {
        super.postMessage({ pageId, type: 'update', maxWidth });
    }

    public initPage(pageId: number, canvas: OffscreenCanvas, svg: string) {
        super.postMessageWithTransfer({ pageId, type: 'init-page', canvas, svg }, [canvas]);
    }

    public rerender(pageId: number, svg?: string) {
        super.postMessage({ pageId, type: 'render', svg });
    }

    public resize(pageId: number, zoom: number) {
        super.postMessage({ pageId, type: 'resize', zoom });
    }

    public delete(pageId: number) {
        super.postMessage({ pageId, type: 'delete' });
    }

    public onMessage(callback: (message: App.PageRenderer.Response) => void): void {
        super.onMessageRaw(callback);
    }
}