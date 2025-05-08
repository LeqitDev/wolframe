export function debug(...args: unknown[]) {
    if (import.meta.env.MODE === "development") { // Only log in development mode
        // log with timestamp
        const timestamp = new Date().toISOString();
        /* const formattedArgs = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2); // Pretty print objects
            }
            return arg;
        }); */
        console.log(`[${timestamp}]`, ...args);
    }
}