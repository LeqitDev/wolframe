import { getContext, setContext } from "svelte";
import eventController from "../events";
import * as Comlink  from 'comlink';
import type { Renderer as RendererType } from '../worker/renderer/renderer';
import type { Compiler as CompilerType } from '../worker/compiler/compiler';

/**
 * EditorManager is a class that manages the loading state of an editor in a Svelte application.
 * It provides methods to set the loading state and to resolve or reject the loading promise.
 * The loading state includes a percentage and a message.
 */
class EditorManager {
    private loadingState = $state({
        percent: 0,
        message: 'Loading Project',
    });

    private openFileId: string = $state('');
    private lastOpenedFiles: string[] = [];

    private _previewFilePath: string | null = $state(null);

    // Access to the renderer and compiler workers
    private Renderer: Comlink.Remote<RendererType> | null = null;
    private Compiler: Comlink.Remote<CompilerType> | null = null;

    /**
     * The loading promise that resolves the editor load function.
     */
    resolveLoadingEditor: ((v: void) => void) | null = null;
    
    /**
     * The loading promise that rejects the editor load function.
     */
    rejectLoadingEditor: ((reason?: string) => void) | null = null;

    /**
     * The loading promise that resolves when the editor is fully loaded.
     * It is created in the constructor and can be awaited.
     */
    loadEditor = new Promise<void>((resolve, reject) => {
        this.resolveLoadingEditor = resolve;
        this.rejectLoadingEditor = reject;
    });

    constructor() {
        eventController.register("file:opened", this.openFile.bind(this));
        eventController.register("file:closed", this.closeFile.bind(this));
    }

    
    get loading() {
        return this.loadingState;
    }

    /**
     * Sets the loading state of the editor.
     * @param percent The percentage of loading progress (0-100).
     * @param message The message to display during loading.
     * @throws Error if the percent is not between 0 and 100.
     * @returns void
     */
    setLoadingState(percent: number, message: string) {
        if (percent < 0 || percent > 100) {
            throw new Error('Percent must be between 0 and 100');
        }
        if (this.loadingState.percent >= percent) {
            return;
        }
        this.loadingState.percent = percent;
        this.loadingState.message = message;
    }

    private openFile(id: string) {
        this.openFileId = id;
        this.lastOpenedFiles = [id, ...this.lastOpenedFiles.filter((file) => file !== id)];
    }

    private closeFile(id: string) {
        this.lastOpenedFiles = this.lastOpenedFiles.filter((file) => file !== id);

        if (this.openFileId === id) {
            if (this.lastOpenedFiles.length === 0) {
                eventController.fire("command/file:open", null);
                this.openFileId = '';
                return;
            }
            eventController.fire("command/file:open", this.lastOpenedFiles[0]);
            this.openFileId = this.lastOpenedFiles[0];
            return;
        }
    }

    getOpenFileId() {
        return this.openFileId;
    }

    /**
     * Sets the renderer worker to be used by the editor.
     * @param renderer The renderer worker to set.
     */
    setRenderer(renderer: Comlink.Remote<RendererType>) {
        this.Renderer = renderer;
    }

    /**
     * Gets the renderer worker used by the editor.
     * @returns The renderer worker.
     * @throws Error if the renderer is not set.
     */
    get renderer() {
        if (!this.Renderer) {
            throw new Error('Renderer not set');
        }
        return this.Renderer;
    }

    /**
     * Sets the compiler worker to be used by the editor.
     * @param compiler The compiler worker to set.
     */
    setCompiler(compiler: Comlink.Remote<CompilerType>) {
        this.Compiler = compiler;
    }

    /**
     * Gets the compiler worker used by the editor.
     * @returns The compiler worker.
     * @throws Error if the compiler is not set.
     */
    get compiler() {
        if (!this.Compiler) {
            throw new Error('Compiler not set');
        }
        return this.Compiler;
    }

    compile() {
        if (!this.Compiler) {
            throw new Error('Compiler not set');
        }
        this.Compiler.compile(Comlink.proxy((output) => {
            eventController.fire("renderer:render", output);
        }), Comlink.proxy((error) => {
            console.error('Error compiling', error);
        }));
    }

    /**
     * Sets the preview file path.
     * @param path The path to the preview file.
     */
    setPreviewFilePath(path: string | null) {
        eventController.fire("file:preview", path);
        this._previewFilePath = path;
    }

    /**
     * Gets the preview file path.
     * @returns The path to the preview file.
     */
    get previewFilePath() {
        return this._previewFilePath;
    }

    dispose() {
        eventController.unregister("file:opened", this.openFile);
        eventController.unregister("file:closed", this.closeFile);
    }
}

const symbol = Symbol('editorManager');

export function getEditorManager(): EditorManager {
    return getContext<ReturnType<typeof setEditorManager>>(symbol);
}

export function setEditorManager() {
    return setContext(symbol, new EditorManager());
}

export type {EditorManager};