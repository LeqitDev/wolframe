/**
 * DragStore is a store that manages the state of drag and drop operations saving both the dragged item and the item that's under the dragged item.
 * 
 * @typeParam T - The type of items being dragged and dropped
 */
export class DragStore<T> {
    private dragItem: T | null = $state(null);
    private dragOverItem: T[] = $state([]);

    /**
     * Clears the dragged item.
     * @returns void
     */
    clearDragItem() {
        this.dragItem = null;
    }

    /**
     * Sets the item that is currently being dragged.
     * @param item - The item to set as the currently dragged item
     */
    setDragItem(item: T) {
        this.dragItem = item;
    }

    /**
     * Gets the item that is currently being dragged.
     * @returns The currently dragged item or null if nothing is being dragged
     */
    getDragItem() {
        return this.dragItem;
    }

    /**
     * Checks if an item is currently being dragged.
     * @returns True if an item is being dragged, false otherwise
     */
    isDragging() {
        return this.dragItem !== null;
    }

    /**
     * Adds an item to the stack of items being dragged over.
     * If the item is already in the stack, it won't be added again.
     * @param item - The item to add to the drag-over stack
     */
    addDragOverItem(item: T) {
        if (this.dragOverItem.includes(item)) {
            return;
        }
        this.dragOverItem.push(item);
    }

    /**
     * Gets the most recent item being dragged over.
     * @returns The last item in the drag-over stack or undefined if the stack is empty
     */
    getDragOverItem() {
        return this.dragOverItem.at(-1);
    }

    /**
     * Removes an item from the drag-over stack.
     * @param item - The item to remove from the drag-over stack
     */
    removeDragOverItem(item: T) {
        const index = this.dragOverItem.indexOf(item);
        if (index !== -1) {
            this.dragOverItem.splice(index, 1);
        }
    }

    /**
     * Clears all items from the drag-over stack.
     */
    clearDragOverItems() {
        this.dragOverItem = [];
    }

    /**
     * Checks if the dragged item is currently over any target items.
     * @returns True if the drag-over stack contains items, false otherwise
     */
    isDraggingOver() {
        return this.dragOverItem.length > 0;
    }
}