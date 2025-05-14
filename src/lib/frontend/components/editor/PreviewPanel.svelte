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

	let zoom = $state(1);

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
				
				page.imgSrc = `data:image/svg+xml;base64,${base}`;
			} else {
				const base = btoa(svg);
				const [x, y, width, height] = viewBox[1].split(' ').map(Number);
				const normalDimensions = {
					width: width,
					height: height,
				};
				pages.push({
					id: createId(),
					normalDimensions,
					imgSrc: `data:image/svg+xml;base64,${base}`,
				});
			}
		}
	}

	function setZoom(x: number) {
		if (x < 0.25) x = 0.25; // minimum zoom
		if (x > 3) x = 3; // maximum zoom
		zoom = x;
	}

	$effect(() => {
		const Renderer = Comlink.wrap<RendererType>(new RendererWorker());
		editorManager.setRenderer(Renderer);
		eventController.register('renderer:render', renderCompilationResult);
        
		return () => {
			eventController.unregister('renderer:render', renderCompilationResult);
        }
	});
</script>

{#snippet pageImg(id: number)}
	{@const page = pages[id]}
	<typst-preview-page-container typst-page={id} class="w-[var(--tpp-width)]" style="--tpp-width: {page.normalDimensions.width * zoom}px; ">
		<img src={page.imgSrc} alt="Page {id} of the output" width={page.normalDimensions.width * zoom} />
	</typst-preview-page-container>
{/snippet}
<div class="h-full flex flex-col">
	<div class="flex items-center justify-between bg-base-200 p-2">
		<div class="join">
			<button class="btn btn-sm btn-soft join-item" onclick={() => setZoom(zoom - .1)}><Minus class="size-4" /></button>
			<details class="dropdown">
				<summary class="btn btn-sm btn-soft join-item">{Math.trunc(zoom * 100)}%</summary>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
					<li><button class="" onclick={() => setZoom(.25)}>25%</button></li>
					<li><button class="" onclick={() => setZoom(.5)}>50%</button></li>
					<li><button class="" onclick={() => setZoom(.75)}>75%</button></li>
					<li><button class="" onclick={() => setZoom(1)}>100%</button></li>
					<li><button class="" onclick={() => setZoom(2)}>200%</button></li>
					<li><button class="" onclick={() => setZoom(3)}>300%</button></li>
				</ul>
			</details>
			<button class="btn btn-sm btn-soft join-item" onclick={() => setZoom(zoom + .1)}><Plus class="size-4" /></button>
		</div>
	</div>
	<typst-preview-scroll-container class="overflow-auto h-full flex justify-center-safe p-[var(--outset)]" style="--outset: 1rem; ">
		<typst-preview-layout-container
			bind:this={canvasContainer}
			class="grid items-center-safe justify-center-safe w-max h-max gap-[var(--page-gap)]"
			style="--page-gap: 1rem;"
		>
			{#each pages as page, i (page.id)}
				{@render pageImg(i)}
			{/each}
		</typst-preview-layout-container>
	</typst-preview-scroll-container>
</div>