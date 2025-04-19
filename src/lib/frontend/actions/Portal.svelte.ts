import type { Action } from "svelte/action";

export const portalAction: Action<HTMLElement, { target?: HTMLElement }> = (node, params: { target?: HTMLElement }) => {
    const target = params.target || document.body;
    const wrapper = document.createElement("div");

    $effect(() => {
        if (node.parentNode !== target) {
            target.appendChild(wrapper);
            wrapper.appendChild(node);
        }

        return () => {
            if (node.parentNode === wrapper) {
                wrapper.removeChild(node);
            }
            if (wrapper.parentNode === target) {
                target.removeChild(wrapper);
            }
        }
    })

}