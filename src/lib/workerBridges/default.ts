import { getUniLogger } from "$lib/stores/logger.svelte";

export abstract class WorkerBridge<Req, Res> {
    private worker: Worker;
    private observer: MessageHandler<Res>[] = [];

    constructor(worker: Worker) {
        this.worker = worker;
        this.worker.onmessage = (event) => {
            this.observer.forEach((o) => o.onMessage(event.data));
        };
    }
    
    addObserver(observer: MessageHandler<Res>) {
        this.observer.push(observer);
    }

    protected postMessage(message: Req, options?: StructuredSerializeOptions) {
        this.worker.postMessage(message, options);
    }

    protected postMessageWithTransfer(message: Req, transfer: Transferable[]) {
        this.worker.postMessage(message, transfer);
    }

    protected onMessageRaw(callback: (message: Res) => void) {
        this.worker.onmessage = (event) => {
            this.observer.forEach((o) => o.onMessage(event.data));
            callback(event.data);
        };
    }
}

export abstract class MessageHandler<Res> {
    abstract onMessage(message: Res): void
}