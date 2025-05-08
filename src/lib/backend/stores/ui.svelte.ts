import { getContext, setContext } from "svelte";

const DEBUG_PANEL_MINIMIZED_HEIGHT = 67; // px

class UiStore {
    private _debugPanelState: 'minimized' | 'expanded' = $state('minimized');
    private _debugPanelMinimizedHeight: number = $state(0);
    private _debugPanelCurrentHeight: number = $state(10);
    private _debugPanelSnapHeight: number = $state(0);

    constructor() {}

    initDebugPanelHeights() {
        let total_height = window.innerHeight;

        // set the minimized height to 40px return percentage
        this._debugPanelMinimizedHeight = (DEBUG_PANEL_MINIMIZED_HEIGHT / total_height) * 100;
        // this._debugPanelCurrentHeight = this._debugPanelMinimizedHeight + .4;
        this._debugPanelSnapHeight = this._debugPanelMinimizedHeight + 3;
    }

    get debugPanelMinimizedHeight() {
        return this._debugPanelMinimizedHeight;
    }

    get debugPanelSnapHeight() {
        return this._debugPanelSnapHeight;
    }

    get debugPanelCurrentHeight() {
        return this._debugPanelCurrentHeight;
    }

    set debugPanelCurrentHeight(height: number) {
        if (height <= this._debugPanelMinimizedHeight + .5) {
            this._debugPanelState = 'minimized';
        } else {
            this._debugPanelState = 'expanded';
        }
        this._debugPanelCurrentHeight = height;
    }

    get debugPanelState() {
        return this._debugPanelState;
    }

    set debugPanelState(state: 'minimized' | 'expanded') {
        this._debugPanelState = state;
    }

    expandDebugPanel() {
        this.debugPanelCurrentHeight = this._debugPanelSnapHeight + 10;
    }
}

const symbol = Symbol('uiManager');

export function getUiStore(): UiStore {
    return getContext<ReturnType<typeof setUiStore>>(symbol);
}

export function setUiStore() {
    return setContext(symbol, new UiStore());
}