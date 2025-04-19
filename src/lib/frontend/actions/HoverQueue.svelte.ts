import type { Action } from 'svelte/action';
import type { HoverQueue } from '../stores/HoverQueue.svelte';

export const hoverQueueActionBuilder = <T>(): Action<HTMLElement, { queue: HoverQueue<T>; item: T }> => {
	return (node, params: { queue: HoverQueue<T>; item: T }) => {
		const handleMouseEnter = () => {
			params.queue.add(params.item);
		};

		const handleMouseLeave = () => {
			params.queue.remove(params.item);
		};

        $effect(() => {
            node.addEventListener('mouseenter', handleMouseEnter);
            node.addEventListener('mouseleave', handleMouseLeave);

            return () => {
                node.removeEventListener('mouseenter', handleMouseEnter);
                node.removeEventListener('mouseleave', handleMouseLeave);
            };
        })
	};
};
