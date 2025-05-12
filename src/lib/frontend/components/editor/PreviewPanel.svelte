<script lang="ts">
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import * as Comlink from 'comlink';
	import type { Output } from 'wolframe-typst-core';
	import RendererWorker from '@/lib/backend/worker/renderer?worker';
	import type { Renderer as RendererType } from '@/lib/backend/worker/renderer/renderer';
	import eventController from '@/lib/backend/events';
	import { debug } from '@/lib/backend/utils';

	const editorManager = getEditorManager();
	let canvasContainer: HTMLDivElement;
	const pages: {
		normalDimensions: {
			width: number;
			height: number;
		};
		previewElement: HTMLImageElement;
		previewContainer: HTMLDivElement;
	}[] = [];

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
				page.previewElement.src = `data:image/svg+xml;base64,${base}`;

				page.previewContainer.style.width = `${page.normalDimensions.width * zoom}px`;
				page.previewContainer.style.height = `${page.normalDimensions.height * zoom}px`;
				page.previewElement.width = page.normalDimensions.width * zoom;
			} else {
				const img = document.createElement('img');
				const base = btoa(svg);
				img.src = `data:image/svg+xml;base64,${base}`;
				const [x, y, width, height] = viewBox[1].split(' ').map(Number);
				img.width = width * zoom;
				const div = document.createElement('div');
				div.setAttribute('typst-page', i.toString());
				div.style.width = `${width * zoom}px`;
				div.style.height = `${height * zoom}px`;
				div.appendChild(img);
				canvasContainer.appendChild(div);
				const normalDimensions = {
					width: width,
					height: height,
				};
				pages.push({
					normalDimensions,
					previewElement: img,
					previewContainer: div,
				});
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

<div class="overflow-auto h-full flex justify-center-safe p-3">
	<div
		bind:this={canvasContainer}
		class="grid items-center-safe justify-center-safe w-max h-max gap-3"
	></div>
</div>