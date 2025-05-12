<script lang="ts">
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import * as Comlink from 'comlink';
	import type { Output } from 'wolframe-typst-core';
	import RendererWorker from '@/lib/backend/worker/renderer?worker';
	import type { Renderer as RendererType } from '@/lib/backend/worker/renderer/renderer';
	import eventController from '@/lib/backend/events';
	import { debug } from '@/lib/backend/utils';
	import { createId } from '@paralleldrive/cuid2';

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
	<typst-preview-page typst-page={id} style="--tpp-width: {page.normalDimensions.width * zoom}px; ">
		<img src={page.imgSrc} alt="Page {id} of the output" width={page.normalDimensions.width * zoom} />
	</typst-preview-page>
{/snippet}

<div class="overflow-auto h-full flex justify-center-safe p-3">
	<div
		bind:this={canvasContainer}
		class="grid items-center-safe justify-center-safe w-max h-max gap-3"
	>
		{#each pages as page, i (page.id)}
			{@render pageImg(i)}
		{/each}
	</div>
</div>

<style>
	typst-preview-page {
		width: var(--tpp-width);
	}
</style>