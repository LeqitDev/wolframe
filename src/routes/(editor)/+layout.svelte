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

	let { children } = $props();

	const editorManager = setEditorManager();
	setVirtualFileSystem();
	const vfs = getVirtualFileSystem();
	const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
	let showConsole = $state(15);

	let canvasContainer: HTMLDivElement;

	function handleTypstError(err: TypstCoreError) {
		console.error('Typst error:', err);
	}

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

	async function rootChanged(path: string | null) {
		if (path) {
			await editorManager.compiler.setRoot(
				path,
				Comlink.proxy((err) => {
					console.log('Error on setRoot:', err);
				})
			);

			editorManager.compile();
		}
	}

	async function fileContentChanged(node: TreeNode, event: Monaco.editor.IModelContentChangedEvent) {
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

			await editorManager.compiler.addFile(
				path,
				content
			);

			editorManager.compile();
		}
	}

	async function deleteFile(node: TreeNode) {
		if (node.isFile) {
			const path = node.path.rooted();

			await editorManager.compiler.removeFile(
				path
			);

			editorManager.compile();
		}
	}

	$effect(() => {
		const Compiler = Comlink.wrap<CompilerType>(new CompilerWorker());
		const Renderer = Comlink.wrap<RendererType>(new RendererWorker());
		editorManager.setRenderer(Renderer);
		eventController.register('renderer:render', renderCompilationResult);

		(async () => {
			await Compiler.initialize(
				Comlink.proxy(async () => {
					console.log('Compiler initialized');
					eventController.fire('compiler:loaded');

					await eventController.waitFor('files:loaded');

					for (const file of vfs.getFiles().filter((f) => f.isFile)) {
						console.log('File:', file.file.name);
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
			eventController.unregister('renderer:render', renderCompilationResult);
			eventController.unregister('file:preview', rootChanged);
			eventController.unregister('file:edited', fileContentChanged);
			eventController.unregister('file:created', addFile);
			eventController.unregister('file:deleted', deleteFile);
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
			<ul class="menu menu-horizontal bg-base-200 h-12 w-full gap-2 p-2">
				<li>
					<DropdownMenuItem name="File">
						<li><a href="/">New File</a></li>
						<li><a href="/">Open File</a></li>
						<li><a href="/">Save</a></li>
						<li><a href="/">Save As</a></li>
						<li><a href="/">Close File</a></li>
						<li><a href="/">Export File</a></li>
					</DropdownMenuItem>
				</li>
				<li>
					<DropdownMenuItem name="Edit">
						<li><a href="/">Undo</a></li>
						<li><a href="/">Redo</a></li>
						<li><a href="/">Cut</a></li>
						<li><a href="/">Copy</a></li>
						<li><a href="/">Paste</a></li>
						<li><a href="/">Select All</a></li>
					</DropdownMenuItem>
				</li>
				<li>
					<DropdownMenuItem name="Project">
						<li><a href="/">Export Project</a></li>
						<li>
							<button onclick={() => (showConsole = showConsole === 0 ? 20 : 0)}>
								{showConsole === 0 ? 'Show' : 'Hide'} Console
							</button>
						</li>
					</DropdownMenuItem>
				</li>
				<li>
					<DropdownMenuItem name="Preview">
						<li><a href="/">Hide Preview</a></li>
						<li><a href="/">Refresh Preview</a></li>
						<li><a href="/">Preview in New Window</a></li>
						<li><a href="/">Zoom In</a></li>
						<li><a href="/">Zoom Out</a></li>
						<li><a href="/">Set Zoom</a></li>
					</DropdownMenuItem>
				</li>
			</ul>
			<Splitpanes horizontal theme="wolframe-theme">
				<Pane size={100} minSize={10} class="">
					<Splitpanes theme="wolframe-theme">
						<Pane size={50} minSize={20} maxSize={80} class="">
							<MonacoEditor />
						</Pane>
						<Pane class="bg-base-300">
							<div bind:this={canvasContainer} class="flex flex-col justify-center-safe items-center-safe gap-3 w-full h-full p-3 overflow-auto"></div>
						</Pane>
					</Splitpanes>
				</Pane>
				<Pane snapSize={10} bind:size={showConsole} class="bg-base-300">
					<p>Console</p>
				</Pane>
			</Splitpanes>
		</Pane>
	</Splitpanes>
</div>

{@render children()}
