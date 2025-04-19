import type { Action } from "svelte/action";
import type { DragStore } from "../stores/DragStore.svelte";
import { createOnceFunction } from "../utils";

const MOVED_THRESHOLD = 10; // px

function massAddStyleToElement(style: CSSStyleDeclaration, dest: HTMLElement) {
    var s = style;
    for ( var i in s ) {
        // Do not use `hasOwnProperty`, nothing will get copied
        if ( typeof s[i] == "string" && s[i] && i != "cssText" && !/\d/.test(i) ) {
            // The try is for setter only properties
            try {
                dest.style[i] = s[i];
                // `fontSize` comes before `font` If `font` is empty, `fontSize` gets
                // overwritten.  So make sure to reset this property. (hackyhackhack)
                // Other properties may need similar treatment
                if ( i == "font" ) {
                    dest.style.fontSize = s.fontSize;
                }
            } catch (e) {}
        }
    }
}

export const dragActionBuilder = <T>(): Action<HTMLElement, { dragStore: DragStore<T>, item: T }, {
    ondragstart: (e: CustomEvent) => void;
    ondragend: (e: CustomEvent) => void;
}> => (node, params: { dragStore: DragStore<T>, item: T }) => {
    let initial_x: number;
    let initial_y: number;
    let relative_x = 0;
    let relative_y = 0;
    let moved_amount: number = 0; // total distance moved
    let tray = document.createElement("div");
    let onDragStart: () => void;

    function drag(event: MouseEvent) {
        // Get total distance moved
        moved_amount += Math.abs(event.clientX - initial_x);
        moved_amount += Math.abs(event.clientY - initial_y);

        // If moved amount is greater than threshold, show tray (button on click event shouldn't be vanished)
        if (moved_amount > MOVED_THRESHOLD) {
            tray.style.display = "block";

            // move tray position to relative to initial position
            tray.style.left = `${event.clientX - relative_x}px`;
            tray.style.top = `${event.clientY - relative_y}px`;

            onDragStart?.();
        }
    }

    function dragStart(event: MouseEvent) {
        // Set default values
        initial_x = event.clientX;
        initial_y = event.clientY;
        relative_x = event.clientX - node.getBoundingClientRect().left;
        relative_y = event.clientY - node.getBoundingClientRect().top;
        moved_amount = 0;

        // Clone the element
        const clonedElement = node.cloneNode(true) as HTMLElement;

        // Add the current style to the cloned element
        massAddStyleToElement(window.getComputedStyle(node), clonedElement);
        clonedElement.style.pointerEvents = "none";
        clonedElement.style.userSelect = "none";

        tray.appendChild(clonedElement);
        document.body.appendChild(tray);

        onDragStart = createOnceFunction(() => {
            node.dispatchEvent(new CustomEvent("dragstart"));
            params.dragStore.setDragItem(params.item);
        });
        
        
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);
    }

    function dragEnd(event: MouseEvent) {
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", dragEnd);

        if (moved_amount > MOVED_THRESHOLD) {
            node.dispatchEvent(new CustomEvent("dragend"));
            params.dragStore.clearDragItem();
            params.dragStore.clearDragOverItems();

            tray.style.display = "none";

            tray.removeChild(tray.firstChild as Node);
            document.body.removeChild(tray);
        }
    }

    $effect(() => {
        node.addEventListener("mousedown", dragStart);

        tray.classList.add("drag-tray");
        tray.style.position = "absolute";
        tray.style.zIndex = "100";
        tray.style.display = "none";
        tray.style.width = "max-content";
        tray.style.pointerEvents = "none"; // Prevent mouse events on tray
        tray.style.userSelect = "none"; // Prevent text selection
        tray.style.cursor = "move";

        return () => {
            node.removeEventListener("mousedown", dragStart);
            document.removeEventListener("mouseup", dragEnd);
            document.removeEventListener("mousemove", drag);
        };
    })
}

export const dragOverActionBuilder = <T>(): Action<HTMLElement, { dragStore: DragStore<T>, item: T }, {
    ondragover: (e: CustomEvent) => void;
    ondragovertimer: (e: CustomEvent) => void;
}> => (node, params: { dragStore: DragStore<T>, item: T }) => {
    let hoverTimer: number | null = null;
    
    function onEnter() {
        if (params.dragStore.isDragging()) {
            node.dispatchEvent(new CustomEvent("dragover"));
            params.dragStore.addDragOverItem(params.item);
            hoverTimer = window.setTimeout(() => {
                node.dispatchEvent(new CustomEvent("dragovertimer"));
                hoverTimer = null;
            }, 300);
        }
    }

    function onLeave() {
        if (params.dragStore.isDraggingOver()) {
            params.dragStore.removeDragOverItem(params.item);
        }
        if (hoverTimer) {
            window.clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }

    $effect(() => {
        node.addEventListener("mouseenter", onEnter);
        node.addEventListener("mouseleave", onLeave);

        return () => {
            node.removeEventListener("mouseenter", onEnter);
            node.removeEventListener("mouseleave", onLeave);
        };
    })
}
