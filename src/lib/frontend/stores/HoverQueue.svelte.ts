import { untrack } from "svelte";

export class HoverQueue<T> {
    private queue: T[] = $state([]);

    add(item: T) {
        this.queue.push(item);
    }

    remove(item: T) {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
            this.queue.splice(index, 1);
        }
    }

    clear() {
        this.queue = [];
    }

    get item() {
        return untrack(() => this.queue.at(-1));
    }

    get updatedItem() {
        return this.queue.at(-1);
    }
}