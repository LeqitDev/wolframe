export class DragStore<T> {
    private dragItem: T | null = $state(null);
    private dragOverItem: T[] = $state([]);

    clearDragItem() {
        this.dragItem = null;
    }

    setDragItem(item: T) {
        this.dragItem = item;
    }

    getDragItem() {
        return this.dragItem;
    }

    isDragging() {
        return this.dragItem !== null;
    }

    addDragOverItem(item: T) {
        if (this.dragOverItem.includes(item)) {
            return;
        }
        this.dragOverItem.push(item);
    }

    getDragOverItem() {
        return this.dragOverItem.at(-1);
    }

    removeDragOverItem(item: T) {
        const index = this.dragOverItem.indexOf(item);
        if (index !== -1) {
            this.dragOverItem.splice(index, 1);
        }
    }

    isDraggingOver() {
        return this.dragOverItem.length > 0;
    }
}