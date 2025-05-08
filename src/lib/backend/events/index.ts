import type { TreeNode } from "../stores/vfs/TreeNode.svelte";
import type { Monaco } from "../monaco";
import { debug } from "../utils";

type AppEvents = {
    "app:loaded": [], // Fired when the app is loaded
    
    "monaco:loaded": [], // Fired when Monaco is loaded
    "monaco/editor:created": [], // Fired when the Monaco editor is created

    "files:loaded": [], // Fired when the files are loaded

    "compiler:loaded": [], // Fired when the compiler is loaded

    "file:opened": [string], // Fired when a file is opened
    "file:closed": [string], // Fired when a file is closed
    "file:edited": [TreeNode, Monaco.editor.IModelContentChangedEvent], // Fired when a file is changed

    "command/file:open": [string | null], // Fired when a file is requested to be opened
}

// One shot events that are fired once and never again
// This is used to track if the event has been executed or not
const executedEvents: {event: keyof AppEvents, executed: boolean, args: unknown[] }[] = [
    {event: "monaco:loaded", executed: false, args: []},
    {event: "monaco/editor:created", executed: false, args: []},
    {event: "files:loaded", executed: false, args: []},
    {event: "compiler:loaded", executed: false, args: []}
]

class EventController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private listeners = new Map<keyof AppEvents, Set<(...args: any[]) => void>>();

    public register<E extends keyof AppEvents>(event: E, callback: (...args: AppEvents[E]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);


        const executedEvent = executedEvents.find(e => e.event === event);
        debug("Registering event", event, executedEvent);
        if (executedEvent) {
            if (executedEvent.executed) {// Event has already been executed, fire the callback immediately
                callback(...executedEvent.args as AppEvents[E]);
            }
        }
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
        debug("Firing event", event, args);

        const executedEvent = executedEvents.find(e => e.event === event);
        if (executedEvent) {
            if (executedEvent.executed) {
                return; // Event has already been executed, do not fire again
            } else {
                executedEvent.executed = true; // Mark the event as executed
                executedEvent.args = args; // Store the arguments for future callbacks
            }
        }

        if (this.listeners.has(event)) {
            // Check if the event has been executed before

            for (const callback of this.listeners.get(event)!) {
                callback(...args);
            }
        }
    }

    public clearAll(): void {
        this.listeners.clear();
    }

    public waitFor<E extends keyof AppEvents>(event: E): Promise<AppEvents[E]> {
        return new Promise((resolve) => {
            const callback = (...args: AppEvents[E]) => {
                this.unregister(event, callback);
                resolve(args);
            };
            this.register(event, callback);
        });
    }

    public resetOneShotEvent(event: keyof AppEvents): void {
        debug("Resetting one shot event", event);

        const executedEvent = executedEvents.find(e => e.event === event);
        if (executedEvent) {
            executedEvent.executed = false; // Mark the event as not executed
            executedEvent.args = []; // Clear the arguments
        }
    }
}

const eventController = new EventController();

export default eventController;