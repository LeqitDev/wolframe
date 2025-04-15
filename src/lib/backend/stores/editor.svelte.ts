import { getContext, setContext } from "svelte";

class EditorManager {
    private loadingState = $state({
        percent: 0,
        message: 'Loading Project',
    })
    resolveLoadingEditor: ((v: void) => void) | null = null;
    rejectLoadingEditor: ((reason?: string) => void) | null = null;
    loadEditor = new Promise<void>((resolve, reject) => {
        this.resolveLoadingEditor = resolve;
        this.rejectLoadingEditor = reject;
    });

    get loading() {
        return this.loadingState;
    }

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
}

const symbol = Symbol('editorManager');

export function getEditorManager(): EditorManager {
    return getContext<ReturnType<typeof setEditorManager>>(symbol);
}

export function setEditorManager() {
    return setContext(symbol, new EditorManager());
}