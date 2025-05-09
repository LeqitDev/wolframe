<script lang="ts">
	import { setEditorManager } from '$lib/backend/stores/editor.svelte';
	import { getVirtualFileSystem, setVirtualFileSystem } from '@/lib/backend/stores/vfs.svelte';
	import DropdownMenuItem from '@/lib/frontend/components/DropdownMenuItem.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import FileExplorer from '@/lib/frontend/components/editor/FileExplorer.svelte';
	import eventController from '@/lib/backend/events';
	import monacoController, { type Monaco } from '@/lib/backend/monaco';
	import { TypstTheme } from '@/lib/backend/monaco/typst/theme';
	import { TypstLanguage } from '@/lib/backend/monaco/typst/language';
	import MonacoEditor from '@/lib/frontend/components/editor/MonacoEditor.svelte';
	import { portalAction } from '@/lib/frontend/actions/Portal.svelte';
	import CompilerWorker from '@/lib/backend/worker/compiler?worker';
	import * as Comlink from 'comlink';
	import { type Compiler as CompilerType } from '@/lib/backend/worker/compiler/compiler';
	import RendererWorker from '@/lib/backend/worker/renderer?worker';
	import { type Renderer as RendererType } from '@/lib/backend/worker/renderer/renderer';
	import type { Output, TypstCoreError } from 'wolframe-typst-core';
	import type { TreeNode } from '@/lib/backend/stores/vfs/TreeNode.svelte';
	import PreviewPanel from '@/lib/frontend/components/editor/PreviewPanel.svelte';
	import Menu from '@/lib/frontend/components/editor/Menu.svelte';
	import DebugPanel from '@/lib/frontend/components/editor/DebugPanel.svelte';
	import { setUiStore } from '@/lib/backend/stores/ui.svelte';
	import CustomSplitpanes from '@/lib/frontend/components/splitpane/Splitpane.svelte';
	import { setDebugStore } from '@/lib/backend/stores/debug.svelte';
	import { debug } from '@/lib/backend/utils';

	let { children } = $props();

	const editorManager = setEditorManager();
	setVirtualFileSystem();
	const vfs = getVirtualFileSystem();
	const uiStore = setUiStore();
	const debugStore = setDebugStore();
	const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
	let showConsole = $state(6);
	let outputMinimized = $state(false);
	let debugPanelSplitter = $state();

	function handleTypstError(err: TypstCoreError) {
		console.error('Typst error:', err);
	}

	async function rootChanged(path: string | null) {
		if (path) {
			await editorManager.compiler.setRoot(
				path,
				Comlink.proxy((err) => {
					debug('error', 'compiler', 'Error on setRoot:', err);
				})
			);

			editorManager.compile();
		}
	}

	async function fileContentChanged(
		node: TreeNode,
		event: Monaco.editor.IModelContentChangedEvent
	) {
		if (node.isFile) {
			const path = node.path.rooted();

			for (const change of event.changes) {
				await editorManager.compiler.edit(
					path,
					change.text,
					change.rangeOffset,
					change.rangeOffset + change.rangeLength,
					Comlink.proxy(handleTypstError)
				);
			}

			editorManager.compile();
		}
	}

	async function addFile(node: TreeNode) {
		if (node.isFile) {
			const path = node.path.rooted();
			const content = node.file.content!;

			await editorManager.compiler.addFile(path, content);

			editorManager.compile();
		}
	}

	async function deleteFile(node: TreeNode) {
		if (node.isFile) {
			const path = node.path.rooted();

			await editorManager.compiler.removeFile(path);

			editorManager.compile();
		}
	}

	function consoleVisibility(show: boolean) {
		showConsole = show ? 15 : 0;
	}

	function addCompileError(err: TypstCoreError) {
		debugStore.compileError = err;
	}

	function clearCompileError() {
		debugStore.compileError = null;
	}

	$effect(() => {
		(debugPanelSplitter as any).setSize(100 - 20);
		uiStore.setDebugPanelSize = (size: number) => {
			(debugPanelSplitter as any).setSize(size);
		}

		eventController.register('command/ui/console:visibility', consoleVisibility);
		eventController.register('compiler/compile:error', addCompileError);
		eventController.register('renderer:render', clearCompileError);

		const Compiler = Comlink.wrap<CompilerType>(new CompilerWorker());

		(async () => {
			await Compiler.initialize(
				Comlink.proxy(async () => {
					debug('info', 'compiler', 'Compiler initialized');
					eventController.fire('compiler:loaded');

					await eventController.waitFor('files:loaded');

					for (const file of vfs.getFiles().filter((f) => f.isFile)) {
						debug('info', 'compiler', 'Adding file:', file.file.name);
						await Compiler.addFile(file.path.rooted(), file.file.content!);
					}

					eventController.register('file:created', addFile);
					eventController.register('file:deleted', deleteFile);

					await rootChanged(editorManager.previewFilePath);

					editorManager.setCompiler(Compiler);

					eventController.register('file:preview', rootChanged);

					eventController.register('file:edited', fileContentChanged);
				})
			);
		})();

		return () => {
			eventController.unregister('file:preview', rootChanged);
			eventController.unregister('file:edited', fileContentChanged);
			eventController.unregister('file:created', addFile);
			eventController.unregister('file:deleted', deleteFile);
			eventController.unregister('command/ui/console:visibility', consoleVisibility);
			eventController.unregister('compiler/compile:error', addCompileError);
			eventController.unregister('renderer:render', clearCompileError);
			editorManager.dispose();
		};
	});
</script>

{#await awaitLoad}
	<div
		class="bg-base-100 absolute top-0 left-0 z-50 flex h-screen w-screen items-center justify-center"
		use:portalAction={{}}
	>
		<p>{editorManager.loading.message}</p>
	</div>
{:catch e}
	<p>{e}</p>
{/await}

<div class="flex h-screen w-screen">
	<Splitpanes theme="wolframe-theme">
		<Pane size={18} snapSize={8} maxSize={70} class="bg-base-200">
			<FileExplorer />
		</Pane>
		<Pane class="">
			<Menu />
			<CustomSplitpanes
				direction="vertical"
				max="-70px"
				min="10%"
				maxThreshold={80}
				maxReleaseThreshold={88}
				class="hover:after:bg-primary!"
				bind:maximized={uiStore.isDebugPanelMinimized}
				bind:this={debugPanelSplitter}
			>
				{#snippet a()}
					<div class="">
						<Splitpanes theme="wolframe-theme">
							<Pane size={50} minSize={20} maxSize={80} class="">
								<MonacoEditor />
							</Pane>
							<Pane class="bg-base-300">
								<PreviewPanel />
							</Pane>
						</Splitpanes>
					</div>
				{/snippet}
				{#snippet b()}
					<div class="bg-base-200 min-h-0 h-full w-full">
						<DebugPanel />
					</div>
				{/snippet}
			</CustomSplitpanes>
		</Pane>
	</Splitpanes>
</div>

{@render children()}
