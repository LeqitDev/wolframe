<script lang="ts">
	import eventController from '@/lib/backend/events';
	import monacoController, { type Monaco } from '@/lib/backend/monaco';
	import { TypstLanguage } from '@/lib/backend/monaco/typst/language';
	import { TypstTheme } from '@/lib/backend/monaco/typst/theme';
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import { getVirtualFileSystem } from '@/lib/backend/stores/vfs.svelte';
	import type { TreeNode } from '@/lib/backend/stores/vfs/TreeNode.svelte';
	import { debug } from '@/lib/backend/utils';
	import { X } from 'lucide-svelte';

	let editorContainer: HTMLDivElement;

	const vfs = getVirtualFileSystem();
	const editor = getEditorManager();

    // let filteredFiles = $derived();

	function onMonacoLoaded() {
		monacoController.createEditor(editorContainer);

		document.fonts.ready.then(() => {
			debug('info', 'monaco/fonts', 'Fonts are ready');
			monacoController.remasureFonts();
		});
	}

	function onChangeSelection(range: Monaco.IRange | {start: number, end: number}) {
		monacoController.changeSelection(range);
	}

	$effect(() => {
		eventController.register('monaco:loaded', onMonacoLoaded);
		eventController.register('command/monaco/editor:selection', onChangeSelection);

		const typstTheme = new TypstTheme();
		const typstLanguage = new TypstLanguage();

		if (!monacoController.isMonacoLoaded()) {
			monacoController.initMonaco();
			monacoController.addTheme(typstTheme);
			monacoController.addLanguage(typstLanguage);
		}

		return () => {
			eventController.unregister('monaco:loaded', onMonacoLoaded);
			eventController.unregister('command/monaco/editor:selection', onChangeSelection);
			monacoController.dispose();
		};
	});
</script>

<div class="h-full">
	{#if vfs.getFiles().filter((file) => file.isFile && file.openedFile).length > 0}
    <div class="overflow-x-auto max-h-12 max-w-full">
		<div role="tablist" class="tabs tabs-sm tabs-box border-base-100 rounded-none border-t min-w-max">
			{#each vfs.getFiles().filter((file) => file.isFile && file.openedFile) as file (file.file.id)}
				<button
					role="tab"
                    type="button"
					class={['tab', editor.getOpenFileId() === file.file.id ? 'tab-active' : '']}
					onclick={() => {
						file.openFile();
					}}>
                    {file.file.name}
                    <!-- svelte-ignore a11y_interactive_supports_focus -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <span role="button" onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        file.closeFile();
                    }} class="ml-1 p-0.5 rounded hover:bg-base-300 z-10"><X class="size-4" /></span>
                </button>
			{/each}
		</div>
    </div>
	{/if}
	<div bind:this={editorContainer} class="h-full"></div>
</div>
