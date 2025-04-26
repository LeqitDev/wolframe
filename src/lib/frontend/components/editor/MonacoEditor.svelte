<script lang="ts">
	import eventController from '@/lib/backend/events';
	import monacoController from '@/lib/backend/monaco';
	import { TypstLanguage } from '@/lib/backend/monaco/typst/language';
	import { TypstTheme } from '@/lib/backend/monaco/typst/theme';
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';
	import { getVirtualFileSystem } from '@/lib/backend/stores/vfs.svelte';
	import type { TreeNode } from '@/lib/backend/stores/vfs/TreeNode.svelte';
	import { X } from 'lucide-svelte';

	let editorContainer: HTMLDivElement;

	const vfs = getVirtualFileSystem();
	const editor = getEditorManager();

    let filteredFiles = $derived(vfs.getFiles().filter((file) => file.isFile && file.openedFile));

	function onMonacoLoaded() {
		monacoController.createEditor(editorContainer);
	}

	$effect(() => {
		eventController.register('monaco:loaded', onMonacoLoaded);

		const typstTheme = new TypstTheme();
		const typstLanguage = new TypstLanguage();

		if (monacoController.isMonacoLoaded()) {
			console.log('Monaco already loaded, creating editor');
			monacoController.dispose();
			monacoController.addTheme(typstTheme);
			monacoController.addLanguage(typstLanguage);
			eventController.fire('monaco:loaded');
		} else {
			monacoController.initMonaco();
			monacoController.addTheme(typstTheme);
			monacoController.addLanguage(typstLanguage);
		}

		return () => {
			eventController.unregister('monaco:loaded', onMonacoLoaded);
			monacoController.dispose();
		};
	});
</script>

<div class="h-full">
	{#if filteredFiles.length > 0}
    <div class="overflow-x-auto max-h-12 max-w-full">
		<div role="tablist" class="tabs tabs-sm tabs-box border-base-100 rounded-none border-t min-w-max">
			{#each filteredFiles as file (file.file.id)}
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
