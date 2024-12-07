// place files you want to import through the `$lib` alias in this folder.

import { getContext, setContext } from "svelte";
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { SvelteMap } from "svelte/reactivity";
import { getLogger, type Logger } from "./logger.svelte";
import type { TypstCompletionProvider } from "$lib/monaco";



export interface VFSFile {
    content: string;
    model: Monaco.editor.ITextModel;
    path: string;
    open?: boolean;
}

export interface Page {
    // canvas: HTMLCanvasElement;
    svg?: string;
    dimensions: { width: number; height: number };
}

interface FlowerState {
    connected: boolean;
    status: 'connected' | 'reconnecting' | 'failed';
    reconnectingAttempts: number;
    maxReconnectAttempts: number;
    curTimeout: Timer | null;
}

export class ProjectAppState {
    vfs: SvelteMap<string, VFSFile> = new SvelteMap();
    monaco?: typeof Monaco;
    pages: Page[] = $state([]);
    logger: Logger;
    typstCompletionProvider?: TypstCompletionProvider;
    currentModel: string = '';
    flowerState: FlowerState = $state({
		connected: false,
		status: 'connected',
		reconnectingAttempts: 0,
		maxReconnectAttempts: 10,
		curTimeout: null
	});
    loading = $state(true);
	loadMessage = $state('Initializing the project');

    constructor() {
        this.logger = getLogger();
        this.logger.logConsole(true);
    }

    getFirstModel() {
        return this.vfs.values().next().value?.model;
    }

    getCurrentFile() {
        return this.vfs.get(this.currentModel);
    }

    getCurrentName() {
        return this.currentModel;
    }

    getActiveModel() {
        return this.vfs.get(this.currentModel)?.model;
    }

    getPageCount() {
        return this.pages.length;
    }

    slicePages(last_index: number) {
        this.pages = this.pages.slice(0, last_index);
    }

    setPage(index: number, page: Page) {
        this.pages[index] = page;
    }

    setPageDimensions(index: number, dimensions: { width: number; height: number }) {
        this.pages[index].dimensions = dimensions;
    }

    getPage(index: number) {
        return this.pages[index];
    }

    updatePageSvg(index: number, svg: string) {
        this.pages[index].svg = svg;
    }

    get openFiles() {
        // return [{ name: string, file: VFSFile }]
        return Array.from(this.vfs.entries()).filter(([_, f]) => f.open).map(([name, file]) => {
            return { name, model: file.model };
        });
    }
}

export function initializePAS(pid: string) {
    return setContext(Symbol('pas-' + pid), new ProjectAppState());
}

export function getPAS(pid: string): ProjectAppState {
    return getContext<ReturnType<typeof initializePAS>>(Symbol('pas-' + pid));
}