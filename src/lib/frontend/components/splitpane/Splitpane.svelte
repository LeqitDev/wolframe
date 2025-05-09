<script lang="ts">
    // https://github.com/Rich-Harris/svelte-split-pane/blob/main/src/lib/SplitPane.svelte
	import type { Snippet } from "svelte";

    type Length = `${number}px` | `${number}%` | `${number}rem` | `${number}em` ;

    interface Props {
        direction: 'horizontal' | 'vertical';
        a?: Snippet;
        b?: Snippet;
        disabled?: boolean;
        pos?: Length;
        min?: Length;
        max?: Length;
        minThreshold?: number;
        minReleaseThreshold?: number;
        maxThreshold?: number;
        maxReleaseThreshold?: number;
    }

    let {
        direction,
        a,
        b,
        disabled,
        pos = '50%',
        min = '0px',
        max = '-60px',
        minThreshold = 0,
        minReleaseThreshold = 0,
        maxThreshold = 80,
        maxReleaseThreshold = 90,
    }: Props = $props();

    let container: HTMLElement;

	let dragging = $state(false);

    function normalize(length: string) {
		if (length[0] === '-') {
			return `calc(100% - ${length.slice(1)})`;
		}

		return length;
	}

	function update(x: number, y: number) {
		if (disabled) return;

		const { top, left, width, height } = container.getBoundingClientRect();

		let p = direction === 'horizontal' ? (x - left) / width : (y - top) / height;

		if (p < 0) p = 0;
		if (p > 1) p = 1;

        let perc = p * 100;

        console.log(perc, maxThreshold, maxReleaseThreshold, perc > maxThreshold, perc > maxReleaseThreshold);
        if (perc > maxThreshold) {
            if (perc > maxReleaseThreshold) {
                perc = 100;
            } else {
                perc = maxThreshold;
            }
        }
        console.log(perc);

		pos = `${perc}%`;
	}

    function drag(node: HTMLElement, callback: (event: PointerEvent) => void) {
        const pointerdown = (event: PointerEvent) => {
			if (
				(event.pointerType === 'mouse' && event.button === 2) ||
				(event.pointerType !== 'mouse' && !event.isPrimary)
			) {
				return;
			}

			node.setPointerCapture(event.pointerId);

			event.preventDefault();

			// dragging = true;

			const onpointerup = () => {
				// dragging = false;

				node.setPointerCapture(event.pointerId);

				window.removeEventListener('pointermove', callback, false);
				window.removeEventListener('pointerup', onpointerup, false);
			};

			window.addEventListener('pointermove', callback, false);
			window.addEventListener('pointerup', onpointerup, false);
		};

		$effect(() => {
			node.addEventListener('pointerdown', pointerdown, { capture: true, passive: false });

			return () => {
				node.removeEventListener('pointerdown', pointerdown);
			};
		});
    }

</script>

<svelte-split-pane bind:this={container} data-orientation={direction} style="--pos: {normalize(pos)}; --min: {normalize(min)}; --max: {normalize(max)}">
    {@render a?.()}
    <svelte-split-pane-devide use:drag={(event) => update(event.clientX, event.clientY)}></svelte-split-pane-devide>
    {@render b?.()}
</svelte-split-pane>

<style>
    svelte-split-pane {
        display: grid;
        position: relative;
        width: 100%;
        height: 100%;
    }

    svelte-split-pane[data-orientation="horizontal"] {
        grid-template-columns: clamp(var(--min), var(--pos), var(--max)) 1fr;
    }

    svelte-split-pane[data-orientation="vertical"] {
        grid-template-rows: clamp(var(--min), var(--pos), var(--max)) 1fr;
    }

    svelte-split-pane-devide {
        position: absolute;
        touch-action: none !important;
    }

    svelte-split-pane-devide::after {
        content: '';
        position: absolute;
        /* background: var(--color-primary); only on hover */
    }

    svelte-split-pane-devide:hover::after {
        background: var(--color-primary);
    }

    [data-orientation="vertical"] > svelte-split-pane-devide {
        padding: 4px 0;
        width: 100%;
        height: 0;
        cursor: ns-resize;
        top: clamp(var(--min), var(--pos), var(--max));
        transform: translate(0, -2px);
    }

    [data-orientation="vertical"] > svelte-split-pane-devide::after {
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
    }
</style>