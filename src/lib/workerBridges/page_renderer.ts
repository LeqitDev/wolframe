import { WorkerBridge } from './default';

export class PageRendererWorkerBridge extends WorkerBridge<App.PageRenderer.Request, App.PageRenderer.Response> {
    constructor(worker: Worker) {
        super(worker);
    }

    public update(pageId: number, maxWidth: number) {
        super.postMessage({ pageId, type: 'update', maxWidth });
    }

    public rerender(pageId: number, svg: string, cachedSvg: boolean = false) {
        super.postMessage({ pageId, type: 'render', svg, cached: cachedSvg });
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