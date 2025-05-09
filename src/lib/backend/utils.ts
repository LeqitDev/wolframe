import { createId } from "@paralleldrive/cuid2";
import { writable } from "svelte/store";

export const debugLogStore = writable<{
    id: string;
    type?: 'info' | 'error' | 'warning';
    domain?: string;
    timestamp: string;
    message: string;
}[]>([]);

export function debug(type?: 'error' | 'warning' | 'info', domain?: string,...args: unknown[]) {
    //if (import.meta.env.MODE === "development") { // Only log in development mode
        // log with timestamp
        const timestamp = new Date().toISOString();
        /* const formattedArgs = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2); // Pretty print objects
            }
            return arg;
        }); */
        console.log(`[${timestamp}]`, ...args);
        
        debugLogStore.update(logs => [...logs, {
            id: createId(),
            type,
            domain,
            timestamp,
            message: args.join(" ")
        }]);
    //}
}