// place files you want to import through the `$lib` alias in this folder.

import { getContext, setContext } from "svelte";
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { SvelteMap } from "svelte/reactivity";
import type { Logger } from "./logger.svelte";
import type { TypstCompletionProvider } from "$lib/monaco";

interface VFSFile {
    name: string;
    content: string;
    model?: Monaco.editor.ITextModel;
}

interface Page {
    canvas: HTMLCanvasElement;
    dimensions: { width: number, height: number };
}

export class ProjectAppState {
    vfs: SvelteMap<string, VFSFile> = new SvelteMap();
    monaco?: typeof Monaco;
    pages: Page[] = $state([]);
    logger?: Logger;
    typstCompletionProvider?: TypstCompletionProvider;
    
    constructor() {}
}

export function initializePAS(pid: string) {
    return setContext(Symbol('pas-' + pid), new ProjectAppState());
}

export function getPAS(pid: string): ProjectAppState {
    return getContext<ReturnType<typeof initializePAS>>(Symbol('pas-' + pid));
}