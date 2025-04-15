type AppEvents = {
    "app:load": []
}

class EventController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private listeners = new Map<keyof AppEvents, Set<(...args: any[]) => void>>();

    public register<E extends keyof AppEvents>(event: E, callback: (...args: AppEvents[E]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public unregister<E extends keyof AppEvents>(event: E, callback: (...args: AppEvents[E]) => void): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(callback);
            if (this.listeners.get(event)!.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    public fire<E extends keyof AppEvents>(event: E, ...args: AppEvents[E]): void {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)!) {
                callback(...args);
            }
        }
    }
}

const eventController = new EventController();

export default eventController;