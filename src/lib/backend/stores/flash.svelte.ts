import { getContext, setContext } from "svelte";

class FlashManager {
    private messages: FlashMessage[] = $state([]);

    add(message: FlashMessage) {
        this.messages.push(message);
    }

    get hasMessages() {
        return this.messages.length > 0;
    }

    getMessage() {
        return this.messages.splice(0, 1)[0] || null;
    }
}

const symbol = Symbol('flashManager');

export function getFlashManager(): FlashManager {
    return getContext<ReturnType<typeof setFlashManager>>(symbol);
}

export function setFlashManager() {
    return setContext(symbol, new FlashManager());
}

export class FlashMessage {
    constructor(
        public type: 'success' | 'info' | 'error',
        public message: string,
        public duration: number | null = 5000,
        public id: string = crypto.randomUUID()
    ) {}
}