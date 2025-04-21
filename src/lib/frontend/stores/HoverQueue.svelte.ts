import { untrack } from "svelte";

/**
 * HoverQueue is a class that manages a queue of items for hover actions.
 * It allows adding, removing, and clearing items from the queue.
 * It also provides a way to get the most recently added item.
 */
export class HoverQueue<T> {
    private queue: T[] = $state([]);

    /**
     * Adds an item to the queue.
     * @param item The item to be added.
     */
    add(item: T) {
        this.queue.push(item);
    }

    /**
     * Removes an item from the queue.
     * @param item The item to be removed.
     */
    remove(item: T) {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
            this.queue.splice(index, 1);
        }
    }

    /**
     * Clears all items from the queue.
     */
    clear() {
        this.queue = [];
    }

    /**
     * Gets the most recently added item from the queue.
     * @remarks This is a freezed property, meaning it will not change on updates in the queue.
     * @returns The most recently added item or undefined if the queue is empty.
     */
    get item() {
        return untrack(() => this.queue.at(-1));
    }

    /**
     * Gets the most recently added item from the queue.
     * @remarks This is a non-freezed property, meaning it will change on updates in the queue.
     * @returns The most recently added item or undefined if the queue is empty.
     */
    get updatedItem() {
        return this.queue.at(-1);
    }
}