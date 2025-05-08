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
			if (i < cur_count) {
				editorManager.renderer.update(i, page);
			} else {
				const canvas = document.createElement('canvas');
				canvas.setAttribute('typst-page', i.toString());
				canvasContainer.appendChild(canvas);

				const offscreen = canvas.transferControlToOffscreen();

				editorManager.renderer.newPage(Comlink.transfer(offscreen, [offscreen]), page);
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

<div
	bind:this={canvasContainer}
	class="flex h-full w-full flex-col items-center-safe justify-center-safe gap-3 overflow-auto p-3"
></div>
