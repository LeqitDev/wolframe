import { getContext, setContext } from "svelte";
import eventController from "../events";

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
        eventController.register("app/file:opened", this.openFile.bind(this));
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
    }

    getOpenFileId() {
        return this.openFileId;
    }

    dispose() {
        eventController.unregister("app/file:opened", this.openFile);
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