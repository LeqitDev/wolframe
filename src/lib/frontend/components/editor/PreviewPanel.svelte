<script lang="ts">
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import * as Comlink from 'comlink';
	import type { Output } from 'wolframe-typst-core';
	import RendererWorker from '@/lib/backend/worker/renderer?worker';
	import type { Renderer as RendererType } from '@/lib/backend/worker/renderer/renderer';
	import eventController from '@/lib/backend/events';
	import { debug } from '@/lib/backend/utils';
	import { createId } from '@paralleldrive/cuid2';
	import { Minus, Plus } from 'lucide-svelte';
	import { ComponentWindow } from '../../utils/ComponentWindow';
	import SelfComponent from "./PreviewPanel.svelte"
	import { tick } from 'svelte';

	const MAX_ZOOM = 5;
	const MIN_ZOOM = 0.25;

	const editorManager = getEditorManager();
	let canvasContainer: HTMLDivElement;
	const pages: {
		id: string;
		normalDimensions: {
			width: number;
			height: number;
		};
		imgSrc: string;
	}[] = $state([]);

	let {
		inPopup = false
	}: {
		inPopup?: boolean;
	} = $props();

	let zoom = $state(1);
	let popupWindow = new ComponentWindow();
	let scrollContainerDimensions = $state({
		width: 0,
		height: 0
	});

	function renderCompilationResult(output: Output) {
		let cur_count = canvasContainer.childElementCount;
		if ('Html' in output) return;
		for (const [i, svg] of output.Svg.entries()) {
			const page = pages.at(i);
			// get viewbox of svg page
			const viewBox = svg.match(/viewBox="([^"]+)"/);
			if (!viewBox) {
				debug('warning', 'Renderer', 'No viewBox found in SVG page. Skipping...');
				continue;
			}
			if (page) {
				const base = btoa(svg);
				const [x, y, width, height] = viewBox[1].split(' ').map(Number);
				const normalDimensions = {
					width: width,
					height: height
				};
				if (page.normalDimensions !== normalDimensions) {
					page.normalDimensions = normalDimensions;
				}
				page.imgSrc = `data:image/svg+xml;base64,${base}`;
			} else {
				const base = btoa(svg);
				const [x, y, width, height] = viewBox[1].split(' ').map(Number);
				const normalDimensions = {
					width: width,
					height: height
				};
				pages.push({
					id: createId(),
					normalDimensions,
					imgSrc: `data:image/svg+xml;base64,${base}`
				});
			}
		}
		// remove extra pages from the dom and the array
		if (cur_count > output.Svg.length) {
			for (let i = cur_count; i > output.Svg.length; i--) {
				pages.pop();
			}
		}
	}

	function setZoom(x: number) {
		if (x < MIN_ZOOM) x = MIN_ZOOM; // minimum zoom
		if (x > MAX_ZOOM) x = MAX_ZOOM; // maximum zoom
		zoom = x;
	}

	$effect(() => {
		if (!inPopup) {
			const Renderer = Comlink.wrap<RendererType>(new RendererWorker());
			editorManager.setRenderer(Renderer);
		}
		eventController.register('renderer:render', renderCompilationResult);

		return () => {
			eventController.unregister('renderer:render', renderCompilationResult);
			popupWindow.unmount();
		};
	});

	function previewActions(node: HTMLDivElement) {
		let isDown = false;
		let startX: number;
		let startY: number;
		let scrollLeft: number;
		let scrollTop: number;

		$effect(() => {
			const handleMouseDown = (e: MouseEvent) => {
				e.preventDefault();
				isDown = true;
				startX = e.pageX - node.offsetLeft;
				startY = e.pageY - node.offsetTop;
				scrollLeft = node.scrollLeft;
				scrollTop = node.scrollTop;
			};
			const handleMouseLeave = () => {
				isDown = false;
			};
			const handleMouseUp = () => {
				isDown = false;
			};
			const handleMouseMove = (e: MouseEvent) => {
				if (!isDown) return;
				e.preventDefault();
				const x = e.pageX - node.offsetLeft;
				const y = e.pageY - node.offsetTop;
				const walkX = x - startX; // * 1.5; // Multiplied by 1.5
				const walkY = y - startY; // * 1.5; // Multiplied by 1.5
				node.scrollLeft = scrollLeft - walkX;
				node.scrollTop = scrollTop - walkY;
			};
			node.addEventListener('mousedown', handleMouseDown);
			node.addEventListener('mouseleave', handleMouseLeave);
			node.addEventListener('mouseup', handleMouseUp);
			node.addEventListener('mousemove', handleMouseMove);

			// Pinch zoom
			const handleWheel = (e: WheelEvent) => {
				if (!e.ctrlKey) return;
				e.preventDefault();

				// Get mouse position relative to the scrollable container
				const rect = node.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;

				// Get current scroll position
				const scrollX = node.scrollLeft;
				const scrollY = node.scrollTop;

				// Calculate point under mouse in document space
				const pointX = scrollX + mouseX;
				const pointY = scrollY + mouseY;

				// Calculate Relative positions
				const relX = pointX / node.scrollWidth;
				const relY = pointY / node.scrollHeight;

				// Calculate zoom speed based on deltaY magnitude
				// Taking absolute value since deltaY direction matters separately
				const zoomSpeed = Math.min(Math.abs(e.deltaY) / 50, 1); // Normalize to 0-1 range with a cap
				const baseIncrement = 0.005; // Base increment for slow movements
				const maxIncrement = 0.2; // Maximum increment for fast movements

				// Calculate actual increment based on speed
				const increment = baseIncrement + zoomSpeed * (maxIncrement - baseIncrement);

				if (e.deltaY < 0) {
					setZoom(zoom + increment); // Zoom in
				} else {
					setZoom(zoom - increment); // Zoom out
				}

				tick().then(() => {
					const newScrollWidth = node.scrollWidth;
					const newScrollHeight = node.scrollHeight;

					// Keep the same relative point under the mouse
					const newScrollX = relX * newScrollWidth - mouseX;
					const newScrollY = relY * newScrollHeight - mouseY;

					node.scrollLeft = newScrollX;
					node.scrollTop = newScrollY;
				});

				// Scroll to maintain the mouse position
				
				// node.scrollLeft = newScrollX;
				// node.scrollTop = newScrollY;
			};
			node.addEventListener('wheel', handleWheel);

			const resizeObserver = new ResizeObserver((entrys, observer) => {
				for (const entry of entrys) {
					if (entry.target === node) {
						const newWidth = entry.contentRect.width;
						const newHeight = entry.contentRect.height;
						if (newWidth !== scrollContainerDimensions.width) {
							scrollContainerDimensions.width = newWidth;
						}
						if (newHeight !== scrollContainerDimensions.height) {
							scrollContainerDimensions.height = newHeight;
						}
					}
				}
			});
			resizeObserver.observe(node);

			return () => {
				// dispose
				node.removeEventListener('mousedown', handleMouseDown);
				node.removeEventListener('mouseleave', handleMouseLeave);
				node.removeEventListener('mouseup', handleMouseUp);
				node.removeEventListener('mousemove', handleMouseMove);
				node.removeEventListener('wheel', handleWheel);
				resizeObserver.unobserve(node);
				resizeObserver.disconnect();
			};
		});
	}

	async function transferToNewWindow() {
		popupWindow.popout(SelfComponent);
		editorManager.compile();
	}

	function zoomToFit(mode: 'width' | 'height') {
		if (mode === 'width') {
			const pageWidth = pages[0].normalDimensions.width;
			zoom = scrollContainerDimensions.width / pageWidth;
		} else if (mode === 'height') {
			const pageHeight = pages[0].normalDimensions.height;
			zoom = scrollContainerDimensions.height / pageHeight;
		}
	}
</script>

{#snippet pageImg(id: number)}
	{@const page = pages[id]}
	<typst-preview-page-container
		typst-page={id}
		class="w-[var(--tpp-width)]"
		style="--tpp-width: {page.normalDimensions.width * zoom}px; "
	>
		<img
			src={page.imgSrc}
			alt="Page {id} of the output"
			width={page.normalDimensions.width * zoom}
		/>
	</typst-preview-page-container>
{/snippet}
<div class="flex h-full flex-col w-full min-w-full" id="preview-anchor">
	<div class="bg-base-200 flex items-center justify-between p-2">
		<div class="join">
			<button class="btn btn-sm btn-soft join-item" onclick={() => setZoom(zoom - 0.1)}
				><Minus class="size-4" /></button
			>
			<details class="dropdown">
				<summary class="btn btn-sm btn-soft join-item">{Math.trunc(zoom * 100)}%</summary>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-10 w-52 p-2 shadow-sm">
					<li><button class="" onclick={() => zoomToFit('width')}>Fit width</button></li>
					<li><button class="" onclick={() => zoomToFit('height')}>Fit height</button></li>
					<div class="divider m-1"></div>
					<li><button class="" onclick={() => setZoom(0.25)}>25%</button></li>
					<li><button class="" onclick={() => setZoom(0.5)}>50%</button></li>
					<li><button class="" onclick={() => setZoom(0.75)}>75%</button></li>
					<li><button class="" onclick={() => setZoom(1)}>100%</button></li>
					<li><button class="" onclick={() => setZoom(2)}>200%</button></li>
					<li><button class="" onclick={() => setZoom(3)}>300%</button></li>
				</ul>
			</details>
			<button class="btn btn-sm btn-soft join-item" onclick={() => setZoom(zoom + 0.1)}
				><Plus class="size-4" /></button
			>
		</div>
		{#if !inPopup}<button class="btn btn-sm btn-soft" onclick={transferToNewWindow}>Popout</button>{/if}
	</div>
	<typst-preview-scroll-container
		class="flex h-full justify-center-safe overflow-auto p-[var(--outset)] min-w-full"
		style="--outset: 1rem; "
		use:previewActions
	>
		<typst-preview-layout-container
			bind:this={canvasContainer}
			class="grid h-max w-max items-center-safe justify-center-safe gap-[var(--page-gap)]"
			style="--page-gap: 1rem;"
			id="preview-layout"
		>
			{#each pages as page, i (page.id)}
				{@render pageImg(i)}
			{/each}
		</typst-preview-layout-container>
	</typst-preview-scroll-container>
</div>
