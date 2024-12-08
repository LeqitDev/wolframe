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
    currentModel: string = $state('');
    flowerState: FlowerState = $state({
		connected: false,
		status: 'connected',
		reconnectingAttempts: 0,
		maxReconnectAttempts: 10,
		curTimeout: null
	});
    loading = $state(true);
	loadMessage = $state('Initializing the project');
    project_path: string;
    openFiles: { relativePath: string; persisted: boolean; model: Monaco.editor.ITextModel }[] = $state([]);
    createModel?: (value: string, language?: string) => Monaco.editor.ITextModel;
    onCurrentModelChange?: (model: Monaco.editor.ITextModel) => void;

    constructor(project_path: string) {
        this.logger = getLogger();
        this.logger.logConsole(true);
        this.project_path = project_path;
    }

    resetVFS() {
        this.currentModel = '';
        this.vfs.forEach((file) => {
            file.model.dispose();
        });
        this.openFiles = [];
        this.vfs.clear();
    }

    addFile(file: Flower.Entry) {
        if (!this.createModel) return;
        const relativePath = file.path.replace(this.project_path + '/', '');
        const content = file.content;

        this.vfs.set(
            relativePath,
            {
                content,
                model: this.createModel(content),
                path: file.path
            }
        )
    }

    moveFile(oldPath: string, newPath: string) {
        if (this.vfs.has(oldPath) === false) return;
        const file = this.vfs.get(oldPath)!;
        this.vfs.delete(oldPath);
        this.vfs.set(newPath, file);
    }

    setCurrentModel(relativePath: string) {
        if (this.vfs.has(relativePath) === false) return;
        this.currentModel = relativePath;
        this.onCurrentModelChange?.(this.vfs.get(relativePath)!.model);
    }

    addOpenFile(path: string, relative: boolean = false, persisted: boolean = false) {
        let relativePath = path;
        if (!relative) {
            relativePath = path.replace(this.project_path + '/', '');
        }

        if (this.vfs.has(relativePath) === false || this.openFiles.findIndex((f) => f.relativePath === relativePath) !== -1) return;
        const model = this.vfs.get(relativePath)!.model;
        if (persisted) {
            this.openFiles.push({ relativePath, persisted, model });
        } else {
            const nonPersistedIndex = this.openFiles.findIndex(f => f.persisted === false);
            if (nonPersistedIndex === -1) {
                this.openFiles.push({ relativePath, persisted, model });
            } else {
                this.openFiles[nonPersistedIndex] = { relativePath, persisted, model };
            }
        }
    }

    removeOpenFile(path: string, relative: boolean = false) {
        let relativePath = path;
        if (!relative) {
            relativePath = path.replace(this.project_path + '/', '');
        }
        const index = this.openFiles.findIndex(f => f.relativePath === relativePath);
        if (index === -1) return;
        this.openFiles.splice(index, 1);
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
}

export function initializePAS(pid: string, project_path: string) {
    return setContext(Symbol('pas-' + pid), new ProjectAppState(project_path));
}

export function getPAS(pid: string): ProjectAppState {
    return getContext<ReturnType<typeof initializePAS>>(Symbol('pas-' + pid));
}