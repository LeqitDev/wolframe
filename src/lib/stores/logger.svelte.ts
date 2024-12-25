import { getContext, setContext } from "svelte";

export type Sections =
    | { section: 'worker'; subsection: 'renderer' }
    | { section: 'main'; subsection: 'sidebar' | 'monaco' | 'ws-flower' | 'preview' }
    | { section: 'wasm'; subsection: 'wasm' };

interface LogRaw {
    type: 'info' | 'warn' | 'error';
    message: unknown[];
    timestamp: number;
}

type Log = LogRaw & (Sections | { section: string });

export const WASMSection = { section: 'wasm', subsection: 'wasm' } as Sections;
export const WorkerRendererSection = { section: 'worker', subsection: 'renderer' } as Sections;
export const MainSidebarSection = { section: 'main', subsection: 'sidebar' } as Sections;
export const MainMonacoSection = { section: 'main', subsection: 'monaco' } as Sections;
export const MainWSFlowerSection = { section: 'main', subsection: 'ws-flower' } as Sections;

export class Logger {
    private _logs: Log[] = $state([]);
    private _logConsole = $state(false);

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
        return `${new Date(log.timestamp).toLocaleTimeString()} - ${log.section} - ${log.message}`;
    }

    sectionToString(section: Sections | string) {
        if (typeof section === 'string') {
            return section;
        }
        return `${section.section}/${section.subsection}`;
    }

    public log(rawLog: LogRaw, section: Sections | string) {
        const sectionString = this.sectionToString(section);
        const log = { ...rawLog, section: sectionString };
        
        if (this._logConsole) {
            switch (log.type) {
                case 'info':
                    console.log(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}]`, ...log.message);
                    break;
                case 'warn':
                    console.warn(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}]`, ...log.message);
                    break;
                case 'error':
                    console.error(`[${new Date(log.timestamp).toLocaleTimeString()} - ${log.section}]`, ...log.message);
                    break;
            }
        }
        this._logs.push(log);
    }

    public info(section: Sections | string, ...message: unknown[]) {
        this.log({ type: 'info', message, timestamp: Date.now() }, section);
    }

    public warn(section: Sections | string, ...message: unknown[]) {
        this.log({ type: 'warn', message, timestamp: Date.now() }, section);
    }

    public error(section: Sections | string, ...message: unknown[]) {
        this.log({ type: 'error', message, timestamp: Date.now() }, section);
    }

    public logConsole(doLog: boolean) {
        this._logConsole = doLog;
    }
}

const uniLogger = new Logger();
uniLogger.logConsole(true);

export function getUniLogger() {
    return uniLogger;
} 

export function initializeLogger() {
    setContext('logger', new Logger());
}

export function getLogger(): Logger {
    return getContext('logger');
}