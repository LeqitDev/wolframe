export abstract class WorkerBridge<Req, Res> {
    private worker: Worker;
    private messageHandler?: MessageHandler<Res>;

    constructor(worker: Worker, messageHandler?: MessageHandler<Res>) {
        this.worker = worker;
        this.messageHandler = messageHandler;
    }

    protected postMessage(message: Req, options?: StructuredSerializeOptions) {
        this.worker.postMessage(message, options);
    }

    protected postMessageWithTransfer(message: Req, transfer: Transferable[]) {
        this.worker.postMessage(message, transfer);
    }

    protected onMessageRaw(callback: (message: Res) => void) {
        this.worker.onmessage = (event) => {
            this.messageHandler?.onMessage(event.data);
            callback(event.data);
        };
    }
}

export abstract class MessageHandler<Res> {
    abstract onMessage(message: Res): void
}