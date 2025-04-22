import type { Modal } from "@/app.types";
import { getContext, setContext } from "svelte";

class ModalManager {
    private _modal: Modal | null = $state(null);

    /**
     * Sets the modal to be displayed.
     * @param modal - The modal to set.
     */
    set(modal: Modal) {
        this._modal = modal;
    }

    /**
     * Checks if a modal is currently set.
     * @returns True if a modal is set, false otherwise.
     */
    get hasModal() {
        return this._modal !== null;
    }

    /**
     * Retrieves the current modal.
     * @returns The current modal or null if no modal is set.
     */
    get modal() {
        return this._modal;
    }

    /**
     * Clears the current modal.
     */
    clear() {
        this._modal = null;
    }
}

const symbol = Symbol('modalManager');

export function getModalManager(): ModalManager {
    return getContext<ReturnType<typeof setModalManager>>(symbol);
}

export function setModalManager() {
    return setContext(symbol, new ModalManager());
}