<script lang="ts">
	// https://github.com/Rich-Harris/svelte-split-pane/blob/main/src/lib/SplitPane.svelte
	import { untrack, type Snippet } from 'svelte';

	type Length = `${number}px` | `${number}%` | `${number}rem` | `${number}em`;

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
		maximized?: boolean;
		minimized?: boolean;
        class?: any;
	}

	let {
		direction,
		a,
		b,
		disabled,
		pos = '100%',
		min = '0px',
		max = '100%',
		minThreshold = 0,
		minReleaseThreshold = 0,
		maxThreshold = 100,
		maxReleaseThreshold = 100,
		minimized = $bindable(false),
		maximized = $bindable(false),
        class: splitterClass
	}: Props = $props();

	let container: HTMLElement;

	let dragging = $state(false);

    export const setSize = (percentage: number) => {
        container.classList.add('add-transition');
        updatePos(percentage);
        setTimeout(() => {
            container.classList.remove('add-transition');
        }, 200);
    };

	function normalize(length: string) {
		if (length[0] === '-') {
			return `calc(100% - ${length.slice(1)})`;
		}

		return length;
	}

    function getContainerSize() {
        const { width, height } = container.getBoundingClientRect();

        return direction === 'horizontal' ? width : height;
    }

    function convertEmToPx(length: string) {
        const em = parseFloat(length);
        const fontSize = parseFloat(getComputedStyle(container).fontSize);

        return `${em * fontSize}px`;
    }

    function convertRemToPx(length: string) {
        const rem = parseFloat(length);
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

        return `${rem * fontSize}px`;
    }

    function getPxOrPercent(length: string): {
        px?: number;
        percent?: number;
    } {
        if (length.endsWith('px')) {
            let px = parseFloat(length);
            if (length[0] === '-') {
                px = getContainerSize() + px;
            }
            return {px};
        } else if (length.endsWith('%')) {
            let percent = parseFloat(length);
            if (length[0] === '-') {
                percent = 100 + percent;
            }
            return {percent};
        } else if (length.endsWith('em')) {
            let px = parseFloat(convertEmToPx(length));
            if (length[0] === '-') {
                px = getContainerSize() + px;
            }
            return {px};
        } else if (length.endsWith('rem')) {
            let px = parseFloat(convertRemToPx(length));
            if (length[0] === '-') {
                px = getContainerSize() + px;
            }
            return {px};
        } else {
            throw new Error(`Unsupported length unit: ${length}`);
        }
    }

    function isMin(perc: number) {
        let minSize = getPxOrPercent(min);

        if (minSize.px) {
            const pxPercent = getContainerSize() * (perc / 100);
            return pxPercent < minSize.px;
        } else if (minSize.percent) {
            return perc < minSize.percent;
        } else {
            throw new Error(`Unsupported min length unit: ${min}`);
        }
    }

    function isMax(perc: number) {
        let maxSize = getPxOrPercent(max);

        if (maxSize.px) {
            const pxPercent = getContainerSize() * (perc / 100);
            return pxPercent > maxSize.px;
        } else if (maxSize.percent) {
            return perc > maxSize.percent;
        } else {
            throw new Error(`Unsupported max length unit: ${max}`);
        }
    }

	function update(x: number, y: number) {
		if (disabled) return;

		const { top, left, width, height } = container.getBoundingClientRect();

		let p = direction === 'horizontal' ? (x - left) / width : (y - top) / height;

		if (p < 0) p = 0;
		if (p > 1) p = 1;

		let perc = p * 100;

		updatePos(perc);
	}

    function updatePos(perc: number) {
        if (perc > maxThreshold) {
			if (perc > maxReleaseThreshold) {
				perc = 100;
			} else {
				perc = maxThreshold;
			}
		} else if (perc < minThreshold) {
			if (perc < minReleaseThreshold) {
				perc = 0;
			} else {
				perc = minThreshold;
			}
		}

        if (isMin(perc)) {
            minimized = true;
        } else {
            minimized = false;
        }

        if (isMax(perc)) {
            maximized = true;
        } else {
            maximized = false;
        }

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

			dragging = true;

			const onpointerup = () => {
				dragging = false;

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

<svelte-split-pane
	bind:this={container}
	data-orientation={direction}
	style="--pos: {normalize(pos)}; --min: {normalize(min)}; --max: {normalize(max)}"
>
	{@render a?.()}
	<svelte-split-pane-devide 
        use:drag={(event) => update(event.clientX, event.clientY)}
        class={splitterClass}
	></svelte-split-pane-devide>
	{@render b?.()}
</svelte-split-pane>

{#if dragging}
	<svelte-split-pane-mousecatcher></svelte-split-pane-mousecatcher>
{/if}

<style>
	svelte-split-pane {
        --sp-thickness: var(--sp-custom-thickness, 4px);
        --sp-color: var(--sp-custom-color, transparent);
		display: grid;
		position: relative;
		width: 100%;
		height: 100%;
	}

	svelte-split-pane[data-orientation='horizontal'] {
		grid-template-columns: clamp(var(--min), var(--pos), var(--max)) 1fr;
	}

	svelte-split-pane[data-orientation='vertical'] {
		grid-template-rows: clamp(var(--min), var(--pos), var(--max)) 1fr;
	}

    :global(svelte-split-pane[data-orientation='vertical'].add-transition) {
        transition: all 0.2s ease-in-out;
    }

	svelte-split-pane-devide {
		position: absolute;
		touch-action: none !important;
	}

	svelte-split-pane-devide::after {
		content: '';
		position: absolute;
		background: var(--sp-color);
	}

	[data-orientation='vertical'] > svelte-split-pane-devide {
		padding: calc(0.5 * var(--sp-thickness)) 0;
		width: 100%;
		height: 0;
		cursor: ns-resize;
		top: clamp(var(--min), var(--pos), var(--max));
		transform: translate(0, calc(-0.5 * var(--sp-thickness)));
	}

	[data-orientation='vertical'] > svelte-split-pane-devide::after {
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
	}

    svelte-split-pane-mousecatcher {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.0001);
	}
</style>
