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

	const currentlyOpenedFiles: TreeNode[] = $state([])

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

	function onFileOpened(id: string) {
		const fileResult = vfs.getFileById(id);
		if (!fileResult.ok) {
			debug('error', 'monaco/editor', 'File not found');
			return;
		}
		const file = fileResult.unwrap();
		if (currentlyOpenedFiles.find((f) => f.file.id === file.file.id)) {
			return;
		}
		currentlyOpenedFiles.push(file);
	}

	function onFileClosed(id: string) {
		const fileResult = vfs.getFileById(id);
		if (!fileResult.ok) {
			debug('error', 'monaco/editor', 'File not found');
			return;
		}
		const file = fileResult.unwrap();
		const index = currentlyOpenedFiles.findIndex((f) => f.file.id === file.file.id);
		if (index !== -1) {
			currentlyOpenedFiles.splice(index, 1);
		}
	}

	$effect(() => {
		let disposables = [];

		disposables.push(
			eventController.register('monaco:loaded', onMonacoLoaded),
			eventController.register('command/monaco/editor:selection', onChangeSelection),
			eventController.register('file:opened', onFileOpened),
			eventController.register('file:closed', onFileClosed),
		);

		const typstTheme = new TypstTheme();
		const typstLanguage = new TypstLanguage();

		if (!monacoController.isMonacoLoaded()) {
			monacoController.initMonaco();
			monacoController.addTheme(typstTheme);
			monacoController.addLanguage(typstLanguage);
		}

		return () => {
			disposables.forEach((disposable) => {
				disposable.dispose();
			});
			monacoController.dispose();
		};
	});
</script>

<div class="grid min-h-0 min-w-0" style="grid-template-rows: auto minmax(0, 1fr);">
	{#if currentlyOpenedFiles.length > 0}
    <div class="overflow-x-auto max-h-12">
		<div role="tablist" class="tabs tabs-sm tabs-box border-base-100 rounded-none border-t">
			{#each currentlyOpenedFiles as file (file.file.id)}
				<button
					role="tab"
                    type="button"
					class={['tab', editor.getOpenFileId() === file.file.id ? 'tab-active' : '']}
					style="--tab-bg: color-mix(in oklab, var(--btn-color, var(--color-base-content)) 8%, var(--color-base-100))"
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
	<div bind:this={editorContainer} class="h-full w-full min-w-0"></div>
</div>
