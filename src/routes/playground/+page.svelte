<script lang="ts">
	import Editor from '$lib/components/editor.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Resizable from '$lib/components/ui/resizable';
	import * as Menubar from '$lib/components/ui/menubar';
	import { TypstLanguage, TypstTheme } from '$lib/monaco/typst';
	import { CompilerWorkerBridge, PageRendererWorkerBridge } from '$lib/workerBridges';
	import CompilerWorker from '$lib/workers/compiler?worker';
	import PageRendererWorker from '$lib/workers/page_renderer?worker';
	import { FileQuestion, FolderOpen, LoaderCircle, PlusCircle, X } from 'lucide-svelte';
	import { type PageData } from './$types';
	import { fade } from 'svelte/transition';
	import { initializePAS } from '$lib/stores/project.svelte';
	import { VFS } from '$lib/stores/vfs.svelte';
	import { getLayoutStore } from '$lib/stores/layoutStore.svelte';
	import { getUniLogger, WorkerRendererSection } from '$lib/stores/logger.svelte';
	import { convertRemToPixels } from '$lib/utils';
	import { untrack } from 'svelte';

	// console.clear();

	let { data }: { data: PageData } = $props();
	const layoutStore = getLayoutStore(); // For Menu and things

	let vfs = new VFS(data.initial_vfs);

	let compiler: CompilerWorkerBridge;
	let renderer: PageRendererWorkerBridge;

	let typstLanguage = new TypstLanguage();
	let typstThemes = new TypstTheme();
	let controller = $state({}) as App.Editor.Controller;

	let canvasContainer: HTMLDivElement;

	let openPublishDialog = $state(false);
	let previewScale = $state(1);

	const projectState = initializePAS(data.project!.id, data.project_path);
	const logger = getUniLogger();

	let panes: {
		editor: {
			obj: Resizable.Pane | null;
			collapsed: boolean;
		};
		preview: {
			obj: Resizable.Pane | null;
			collapsed: boolean;
		};
	} = $state({
		editor: {
			obj: null,
			collapsed: false
		},
		preview: {
			obj: null,
			collapsed: false
		}
	});

	function init() {
		initLayoutStore();
		initRenderer();
		initCompiler();
	}

	function initRenderer() {
		renderer = new PageRendererWorkerBridge(new PageRendererWorker());
	}

	function initCompiler() {
		console.log('Initializing compiler', $effect.tracking());
		compiler = new CompilerWorkerBridge(new CompilerWorker());
		typstLanguage.setCompiler(compiler);
		compiler.init('/main.typ');
		compiler.addObserver({ onMessage: compilerCompileResult });
		compiler.addObserver({ onMessage: compilerLogger });
		vfs.entries.forEach((file) => {
			if (file.content === undefined) return;
			compiler.add_file(file.path, file.content);
		});

		compiler.compile();
	}

	function initLayoutStore() {
		layoutStore.setMenubarSnippet(menubar);
		layoutStore.setSidebarActive('');
		layoutStore.setSidebarPreview('');
		layoutStore.setSidebarActions({
			onFileClick(file) {
				openFile(file.path);
			},
			onNewFile(file) {
				newFile(file.path, '');
				openFile(file.path);
			},
			onPreviewFileChange(file) {
				setPreview(file.path);
			},
			onFileDeleted(file) {
				vfs.deleteFile(file.path);
				controller.removeModel!(file.path);
				// TODO: Remove from compiler
			},
		});
	}

	$effect(() => untrack(() =>{
		init();
	}));

	$effect(() => {
		if (controller.addModel === undefined) return;
		untrack(() => {
			vfs.entries.forEach((file) => {
				if (file.content === undefined) return;
				controller.addModel!(file.content, file.path);
			});

			setPreview('/main.typ');
			openFile('/main.typ');
		})
	});

	function newFile(path: string, content: string) {
		vfs.addFile(path, content);
		controller.addModel!(content, path);
		compiler.add_file(path, content);
		compiler.compile();
	}

	function setPreview(path: string) {
		layoutStore.setSidebarPreview(path);
		compiler?.set_root(path);
	}

	function closeFile(path: string) {
		let last = vfs.closeFile(path);
		if (last) {
			openFile(last);
		} else {
			controller.setModel!(null);
			layoutStore.setSidebarActive('');
		}
	}

	function setActiveFile(path: string) {
		controller.setModel!(path);
		layoutStore.setSidebarActive(path);
	}

	function openFile(path: string) {
		vfs.openFile(path);
		setActiveFile(path);
	}

	function compilerLogger(message: App.Compiler.Response) {
		if (message.type === 'error') {
			switch (message.sub) {
				case 'compile':
					logger.error(WorkerRendererSection, 'Failed to compile', ...message.errors);
					break;
				case 'default':
					logger.error(WorkerRendererSection, message.error);
					break;
			}
		}
	}

	function compilerCompileResult(message: App.Compiler.Response) {
		if (message.type === 'compile') {
			const compiled = message.svgs;

			for (const [i, svg] of compiled.entries()) {
				if (projectState.getPageCount() <= i) {
					const canvas = document.createElement('canvas');
					canvasContainer.appendChild(canvas);
					const offscreen = canvas.transferControlToOffscreen();

					projectState.pages.push({
						// canvas: msg.canvas,
						svg,
						dimensions: { width: 0, height: 0 }
					});

					renderer?.initPage(i, offscreen, svg);
					logger.info(WorkerRendererSection, 'Page', i, 'rendering');
				} else {
					projectState.updatePageSvg(i, svg);
					logger.info(WorkerRendererSection, 'Page', i, 'forcing rerender');
					renderer?.rerender(i, svg);
				}
			}

			// Remove any extra pages
			if (projectState.getPageCount() > compiled.length) {
				logger.info(
					WorkerRendererSection,
					'Removing extra pages',
					projectState.getPageCount() - compiled.length
				);
				for (let i = compiled.length; i < projectState.getPageCount(); i++) {
					logger.info(WorkerRendererSection, 'Removing page', i);
					renderer?.delete(i);

					const canvas = canvasContainer.children[i] as HTMLCanvasElement;
					canvas.remove();
				}

				projectState.slicePages(compiled.length);
			}
		}
	}

	function status(message: string, finished: boolean) {
		if (finished) {
			projectState.loadMessage = message;
			projectState.loading = false;
		} else {
			projectState.loadMessage = message;
			projectState.loading = true;
		}
	}

	function zoomPreview() {
		canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
		canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;

		if (previewScale < 1 && canvasContainer.style.alignItems !== 'center') {
			canvasContainer.style.alignItems = 'center';
		} else {
			if (previewScale >= 1 && canvasContainer.style.alignItems !== 'start') {
				canvasContainer.style.alignItems = 'start';
			}
		}

		renderer?.resize(-1, previewScale);
	}

	function canvasLoad(node: HTMLDivElement) {
		$effect(() => {
			node.style.gap = `${previewScale * convertRemToPixels(5)}px`;
			node.style.padding = `${previewScale * convertRemToPixels(4)}px`;
			
			let styles = getComputedStyle(node);

			let innerWidth = parseFloat(styles.width) - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);

			renderer?.update(-1, innerWidth);

			/* TODO: Provide option to lock size to window let resizeObserver = new ResizeObserver(() => {
			});

			resizeObserver.observe(node);

			return () => {
				resizeObserver.disconnect();
			}; */
		})
	}
</script>

{#snippet emptyEditor()}
	<div class="flex h-full w-full flex-col items-center justify-center">
		<div>
			<FileQuestion class="mb-6 size-20 text-primary" />
		</div>
		<h2 class="mb-4 text-center text-3xl font-bold">Oops! This Space Looks Empty</h2>
		<p class="mb-8 max-w-md text-center text-muted-foreground">
			Looks like your code took a break. Don't worry, <span class="italic underline">click</span> on
			a file on the left to get started or create a new file for all your
			<span class="italic underline">amazing</span> ideas.
		</p>
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Button variant="outline" class="flex items-center gap-2">
				<PlusCircle class="size-4" />
				New File
			</Button>
			<Button variant="outline" class="flex items-center gap-2">
				<FolderOpen class="size-4" />
				Open File
			</Button>
		</div>
	</div>
{/snippet}

<form method="POST" action="?/newFile" id="new-file-form" class="hidden"></form>

{#snippet menubar()}
	<Menubar.Root>
		<Menubar.Menu>
			<Menubar.Trigger>Window</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item
					onclick={() => {
						if (panes.editor.obj?.isCollapsed()) {
							panes.editor.obj?.expand();
						} else {
							panes.editor.obj?.collapse();
						}
					}}
				>
					{panes.editor.obj?.isCollapsed() ? 'Show' : 'Hide'} Editor
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						if (panes.preview.obj?.isCollapsed()) {
							panes.preview.obj?.expand();
						} else {
							panes.preview.obj?.collapse();
						}
					}}
				>
					{panes.preview.obj?.isCollapsed() ? 'Show' : 'Hide'} Preview
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger>Project</Menubar.Trigger>
			<Menubar.Content>
				{#if data.project?.isPackage}
					<Menubar.Item
						onclick={() => {
							openPublishDialog = true;
						}}
					>
						Publish Version
					</Menubar.Item>
				{/if}
				<Menubar.Item
					onclick={() => {
						compiler.print_files();
					}}
				>
					Print Files
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger>Preview</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item
					onclick={() => {
						if (previewScale < 2) {
							previewScale += 0.1;
							zoomPreview();
						}
					}}
				>
					Zoom In
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						if (previewScale > 0.6) {
							previewScale -= 0.1;
							zoomPreview();
						}
					}}
				>
					Zoom Out
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						previewScale = 1;
						zoomPreview();
					}}
				>
					Reset Zoom
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
	</Menubar.Root>
{/snippet}

{#if projectState.loading}
	<div
		class="absolute left-0 top-0 z-50 flex h-screen w-screen items-center justify-center bg-background"
		transition:fade
	>
		<div class="flex flex-col items-center justify-center">
			<LoaderCircle class="animate-spin" />
			<p class="text-center">{projectState.loadMessage}...</p>
			{#if projectState.flowerState.status === 'reconnecting'}
				<p>Attempt {projectState.flowerState.reconnectingAttempts}</p>
			{:else if projectState.flowerState.status === 'failed'}
				<p>Failed to connect to Typst Flower Service</p>
			{/if}
		</div>
	</div>
{/if}

<Resizable.PaneGroup direction="horizontal" autoSaveId="ideLayout" class="w-full">
	<Resizable.Pane
		defaultSize={50}
		collapsedSize={0}
		collapsible={true}
		minSize={15}
		bind:this={panes.editor.obj}
		class=""
	>
		<div class="flex h-full flex-col">
			<div class={`flex ${vfs.openedFiles.length === 0 ? 'min-h-0' : 'min-h-10 border-b'}`}>
				{#each vfs.openedFiles as file}
					<Button
						size="sm"
						variant="outline"
						class={`h-full rounded-none border-b-0 border-l-0 border-r text-sm ${controller.activeModelPath === file.path ? 'border-t-2 border-t-emerald-300 bg-accent' : ''}`}
						onclick={() => {
							let entry = vfs.entries.find((entry) => entry.path === file.path)!;
							if (entry.open) {
								setActiveFile(file.path);
							}
						}}
					>
						{file.display.name}
						<span class="text-muted-foreground">
							{#if file.display.prefix}
								{file.display.prefix}
							{/if}
						</span>
						<button
							class="rounded-md p-0.5 hover:bg-slate-600"
							onclick={() => {
								closeFile(file.path);
							}}
						>
							<X />
						</button>
					</Button>
				{/each}
			</div>
			<Editor
				languages={[typstLanguage]}
				themes={[typstThemes]}
				bind:editorController={controller}
				{status}
				children={emptyEditor}
			/>
		</div>
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane collapsedSize={0} collapsible={true} minSize={15}>
		<div
			id="canvas-container"
			bind:this={canvasContainer}
			use:canvasLoad
			role="presentation"
			class="flex h-full w-full flex-col items-start overflow-x-auto overflow-y-auto"
		></div>
	</Resizable.Pane>
</Resizable.PaneGroup>

<style>
	:global(.typst-doc) {
		width: 100% !important;
		height: 100% !important;
	}
</style>
