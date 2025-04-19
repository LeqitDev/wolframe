import type { Action } from "svelte/action";

export const contextMenuAction: Action<HTMLElement, { target?: HTMLElement}, {
    onshowmenu: (e: CustomEvent<{x: number, y:number}>) => void;
    onhidemenu: (e: CustomEvent) => void;
}> = (node, params: { target?: HTMLElement }) => {
    const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        node.dispatchEvent(new CustomEvent("showmenu", {
            detail: {
                x: event.pageX,
                y: event.pageY,
            },
        }));
        if (!params.target) return;
        params.target.style.left = `${event.pageX}px`;
        params.target.style.top = `${event.pageY}px`;
        params.target.classList.remove("hidden");
    };

    const handleClick = () => {
        node.dispatchEvent(new CustomEvent("hidemenu"));
        if (!params.target) return;
        params.target.classList.add("hidden");
    };

    $effect(() => {
        node.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("click", handleClick);

        return () => {
            node.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("click", handleClick);
        };
    })
}