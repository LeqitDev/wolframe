import { getContext, setContext } from "svelte";
import type { TypstCoreError } from "wolframe-typst-core";

class DebugStore {
    compileError: TypstCoreError | null = $state(null);
}


const symbol = Symbol('debugStore');

export function getDebugStore(): DebugStore {
    return getContext<ReturnType<typeof setDebugStore>>(symbol);
}

export function setDebugStore() {
    return setContext(symbol, new DebugStore());
}