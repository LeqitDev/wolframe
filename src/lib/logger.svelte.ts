import { getContext, setContext } from "svelte";

type Sections =
    | { section: 'worker'; subsection: 'renderer' }
    | { section: 'main'; subsection: 'sidebar' | 'monaco' | 'ws-flower' | 'preview' }
    | { section: 'wasm'; subsection: 'wasm' };

interface LogRaw {
    type: 'info' | 'warn' | 'error';
    message: any[];
    timestamp: number;
}

type Log = LogRaw & Sections;

export class Logger {
    private _logs: Log[] = $state([]);
    private _logConsole = $state(false);
    
    wasmSection = { section: 'wasm', subsection: 'wasm' } as Sections;
    workerRendererSection = { section: 'worker', subsection: 'renderer' } as Sections;
    mainSidebarSection = { section: 'main', subsection: 'sidebar' } as Sections;
    mainMonacoSection = { section: 'main', subsection: 'monaco' } as Sections;
    mainWSFlowerSection = { section: 'main', subsection: 'ws-flower' } as Sections;

    public get logs() {
        return this._logs;
    }

    public clearLogs() {
        if (this._logConsole) {
            console.clear();
        }
        this._logs = [];
    }

    rawToString(log: Log) {
        return `${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}/${log.subsection} - ${log.message}`;
    }

    public log(rawLog: LogRaw, section: Sections) {
        const log = { ...rawLog, ...section };
        
        if (this._logConsole) {
            switch (log.type) {
                case 'info':
                    console.log(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}/${log.subsection}]`, ...log.message);
                    break;
                case 'warn':
                    console.warn(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}/${log.subsection}]`, ...log.message);
                    break;
                case 'error':
                    console.error(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}/${log.subsection}]`, ...log.message);
                    break;
            }
        }
        this._logs.push(log);
    }

    public info(section: Sections, ...message: any[]) {
        this.log({ type: 'info', message, timestamp: Date.now() }, section);
    }

    public warn(section: Sections, ...message: any[]) {
        this.log({ type: 'warn', message, timestamp: Date.now() }, section);
    }

    public error(section: Sections, ...message: any[]) {
        this.log({ type: 'error', message, timestamp: Date.now() }, section);
    }

    public logConsole(doLog: boolean) {
        this._logConsole = doLog;
    }
}

export function initializeLogger() {
    setContext('logger', new Logger());
}

export function getLogger(): Logger {
    return getContext('logger');
}