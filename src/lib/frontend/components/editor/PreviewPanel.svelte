<script lang="ts">
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import * as Comlink from 'comlink';
	import type { Output } from 'wolframe-typst-core';
	import RendererWorker from '@/lib/backend/worker/renderer?worker';
	import type { Renderer as RendererType } from '@/lib/backend/worker/renderer/renderer';
	import eventController from '@/lib/backend/events';

	const editorManager = getEditorManager();
	let canvasContainer: HTMLDivElement;
	

	function renderCompilationResult(output: Output) {
		let cur_count = canvasContainer.childElementCount;
		if ('Html' in output) return;
		for (const [i, page] of output.Svg.entries()) {
			const child = canvasContainer.children[i];
			if (child) {
				const base = btoa(page);
				(child as HTMLImageElement).src = `data:image/svg+xml;base64,${base}`;
			} else {
				const img = document.createElement('img');
				img.setAttribute('typst-page', i.toString());
				const base = btoa(page);
				img.src = `data:image/svg+xml;base64,${base}`;
				img.width = 5000;
				canvasContainer.appendChild(img);
			}
			/* if (i < cur_count) {
				editorManager.renderer.update(i, page);
			} else {
				const canvas = document.createElement('canvas');
				canvas.setAttribute('typst-page', i.toString());
				canvasContainer.appendChild(canvas);

				const offscreen = canvas.transferControlToOffscreen();

				editorManager.renderer.newPage(Comlink.transfer(offscreen, [offscreen]), page);
			} */
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

<div class="overflow-auto h-full">
	<div
		bind:this={canvasContainer}
		class="grid items-center-safe justify-center-safe w-max gap-3 p-3"
	></div>
</div>