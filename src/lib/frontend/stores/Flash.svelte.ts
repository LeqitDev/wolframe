import { getContext, setContext } from "svelte";

/**
 * FlashManager is a class that manages flash messages in a Svelte application.
 * It allows adding, retrieving, and checking the existence of flash messages.
 */
class FlashManager {
    private messages: FlashMessage[] = $state([]);

    /**
     * Adds a flash message to the manager.
     * @param message - The flash message to add.
     */
    add(message: FlashMessage) {
        this.messages.push(message);
    }

    /**
     * Checks if there are any flash messages.
     * @returns True if there are flash messages, false otherwise.
     */
    get hasMessages() {
        return this.messages.length > 0;
    }

    /**
     * Retrieves and removes the first flash message from the manager.
     * @returns The first flash message or null if there are no messages.
     */
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