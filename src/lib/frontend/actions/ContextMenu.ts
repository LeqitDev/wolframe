import type { Action } from "svelte/action";

export const contextmenu: Action<HTMLElement, { target: HTMLElement}> = (node, params: { target: HTMLElement}) => {
    const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        params.target.style.left = `${event.pageX}px`;
        params.target.style.top = `${event.pageY}px`;
        params.target.classList.remove("hidden");
    };

    const handleClick = () => {
        params.target.classList.add("hidden");
    };

    node.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);

    return {
        destroy() {
            node.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("click", handleClick);
        }
    };
}