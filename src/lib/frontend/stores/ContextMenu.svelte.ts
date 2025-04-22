import { getContext, setContext } from "svelte";

class ContextMenuStore {
    position: { x: number; y: number } = $state({ x: 0, y: 0 });
    show: boolean = $state(false);
}

const symbol = Symbol('contextMenuStore');

export function getContextMenuStore(): ContextMenuStore {
    return getContext<ReturnType<typeof setContextMenuStore>>(symbol);
}

export function setContextMenuStore() {
    return setContext(symbol, new ContextMenuStore());
}