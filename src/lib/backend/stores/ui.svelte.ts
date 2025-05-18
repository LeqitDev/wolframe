import { getContext, setContext } from "svelte";

const DEBUG_PANEL_MINIMIZED_HEIGHT = 67; // px

class UiStore {
    isPreviewVisible: boolean = $state(true);
    isDebugPanelMinimized: boolean = $state(true);
    setDebugPanelSize: (percentage: number) => void = $state(() => {});

    constructor() {}
}

const symbol = Symbol('uiManager');

export function getUiStore(): UiStore {
    return getContext<ReturnType<typeof setUiStore>>(symbol);
}

export function setUiStore() {
    return setContext(symbol, new UiStore());
}