<script lang="ts">
	import { getController, type Controller } from '$lib/stores/controller.svelte';
	import { getUniLogger } from '$lib/stores/logger.svelte';
	import eventController from '$lib/utils';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import { untrack, type Snippet } from 'svelte';

	let {
		children
	}: {
        onDidChangeModelContent?: (model: Monaco.editor.ITextModel, e: Monaco.editor.IModelContentChangedEvent) => void;
		children?: Snippet;
	} = $props();

	const controller: Controller = getController();
	let editorContainer: HTMLDivElement;
	eventController.register('onMonacoInitialized', () => {
		controller.createEditor(editorContainer);
	});

	$effect(() => {
		untrack(() => {
			controller.logger.info('editor/effect', 'Editor effect triggered', controller.monacoOk);
			if (controller.monacoOk) { // for hot reloads
				controller.createEditor(editorContainer);
			}
		});
		return () => {
			controller.disposeEditor();
		};
	});
</script>

<div class="flex-1 h-full max-h-[calc(100%-40px)] w-full">
	<div bind:this={editorContainer} class="h-full w-full">
		{#if controller.isEditorEmpty}
			{@render children?.()}
		{/if}
	</div>
</div>
