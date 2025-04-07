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
	import { convertRemToPixels, debounce } from '$lib/utils';
	import { untrack } from 'svelte';
	import { IndexedDBFileSystem } from '$lib/utils/playground';
	import type monaco from '$lib/monaco/editor';
	import { getController, type Controller } from '$lib/stores/controller.svelte';
	import {
		type ViewNode,
		FileViewNode,
		type FolderViewNode,
	} from '$lib/fileview/index.svelte';

	const ZOOM_OUT_LIMIT = 0.1;
	const ZOOM_IN_LIMIT = 2;

	let { data }: { data: PageData } = $props();
	//const layoutStore = getLayoutStore(); // For Menu and things
	const controller: Controller = getController();
	const backPanels = new Map<number, {target: HTMLDivElement, dim: {width: number, height: number}}>();
	let maxWidth = 0;

	let compiler: CompilerWorkerBridge;
	let renderer: PageRendererWorkerBridge;

	let typstLanguage = new TypstLanguage();
	let typstThemes = new TypstTheme();
	//let editor_controller = $state({}) as App.Editor.Controller;

	let canvasContainer: HTMLDivElement;

	let openPublishDialog = $state(false);
	let previewScale = $state(1);
	let initOk = false;
	const waitForInit = new Promise<void>((resolve) => {
		let interval = setInterval(() => {
			if (initOk) {
				clearInterval(interval);
				resolve();
			}
		}, 100);
	});

	const projectState = initializePAS(data.project!.id, data.project_path);
	const logger = getUniLogger();

	const updateDebouncer = debounce(() => {
		renderer?.update(-1, maxWidth);
	}, 200);

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
		initOk = true;
		initLayoutStore();
		initRenderer();
		initCompiler();
	}

	function initRenderer() {
		renderer = new PageRendererWorkerBridge(new PageRendererWorker());
		renderer.addObserver({ onMessage: rendererMessageHandler });
	}

	function initCompiler() {
		console.log('Initializing compiler', $effect.tracking());
		compiler = new CompilerWorkerBridge(new CompilerWorker());
		typstLanguage.setCompiler(compiler);
		const mainFile = controller.vfs.getMainFile();
		compiler.init(mainFile?.file.path ?? '');
		controller.previewFile = mainFile?.file.path ?? '';
		compiler.addObserver({ onMessage: compilerCompileResult });
		compiler.addObserver({ onMessage: compilerLogger });
		controller.vfs.entries.forEach((entry) => {
			if (entry.file.content === undefined) return;
			compiler.add_file(entry.file.path, entry.file.content);
		});

		compiler.compile();
	}

	function initLayoutStore() {
		controller.setMenuSnippet(menubar);
		controller.setActiveFile('');
		controller.setPreviewFile('');
		/* layoutStore.setSidebarActions({
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
				vfs!.deleteFile(file.path);
				editor_controller.removeModel!(file.path);
				// TODO: Remove from compiler
			}
		}); */
	}
	function handleSidebarFileClick(file: FileViewNode) {
		controller.openFile(file.path);
	}

	function handleSidebarNewFile(file: FileViewNode) {
		controller.newFile(file.path, '');
		console.log('Creating new file', file.path);
		controller.openFile(file.path);
		compiler.add_file(file.path, '');
	}

	function handleSidebarNewDir(folder: FolderViewNode) {
		controller.vfs.addDir(folder.path);
	}

	function handleSidebarPreviewFileChange(file: FileViewNode) {
		controller.logger.info(WorkerRendererSection, 'Preview file changed', file.path);
		compiler.set_root(file.path);
		compiler.compile();
		controller.setPreviewFile(file.path);
	}

	function handleSidebarFileDeleted(file: FileViewNode) {
		console.log('Deleting file', file.path);
		controller.closeFile(file.path);
		controller.removeModel(file.path);
		controller.vfs.deleteFile(file.path);
		// TODO: Remove from compiler
	}

	function handleSidebarDirDeleted(folder: FolderViewNode) {
		console.log('Deleting folder', folder.path);
		for (const file of folder.children) {
			if (file instanceof FileViewNode) {
				handleSidebarFileDeleted(file);
			} else {
				handleSidebarDirDeleted(file as FolderViewNode);
			}
		}
		controller.vfs.deleteFile(folder.path);
	}

	function handleSidebarNodeMoved(node: ViewNode, newPath: string, root: boolean = true) {
		newPath = newPath + '/' + node.name;
		console.log('Moving node', node.path, 'to', newPath);
		if (node instanceof FileViewNode) {
			controller.moveFile(node.path, newPath);
			compiler.move(node.path, newPath);
		} else {
			const folder = node as FolderViewNode;
			controller.vfs.moveFile(folder.path, newPath);
			for (const file of folder.children) {
				if (file instanceof FileViewNode) {
					handleSidebarNodeMoved(file, newPath, false);
				} else {
					handleSidebarNodeMoved(file as FolderViewNode, newPath, false);
				}
			}
		}
		if (root) compiler.compile();
	}

	$effect(() => {
		controller.registerLanguage(typstLanguage);
		controller.registerTheme(typstThemes);
		console.log('Registering language and theme');
		controller.eventListener.register('onVFSInitialized', init);
		controller.eventListener.register('onDidChangeModelContent', onDidChangeModelContent);

		controller.eventListener.register('onSidebarFileClick', handleSidebarFileClick);
		controller.eventListener.register('onSidebarNewFile', handleSidebarNewFile);
		controller.eventListener.register('onSidebarNewDir', handleSidebarNewDir);
		controller.eventListener.register('onSidebarPreviewFileChange', handleSidebarPreviewFileChange);
		controller.eventListener.register('onSidebarFileDeleted', handleSidebarFileDeleted);
		controller.eventListener.register('onSidebarDirDeleted', handleSidebarDirDeleted);
		controller.eventListener.register('onSidebarNodeMoved', handleSidebarNodeMoved);
		untrack(() => {
			// for hot reloads
			if (controller.monacoOk) {
				init();
				controller.initExternals();
				controller.postInitExternals();
			}
		});

		return () => {
			compiler?.dispose();
			renderer?.dispose();
			controller.eventListener.unregister('onVFSInitialized', init);
			controller.eventListener.unregister('onDidChangeModelContent', onDidChangeModelContent);
			controller.eventListener.unregister('onSidebarFileClick', handleSidebarFileClick);
			controller.eventListener.unregister('onSidebarNewFile', handleSidebarNewFile);
			controller.eventListener.unregister('onSidebarNewDir', handleSidebarNewDir);
			controller.eventListener.unregister(
				'onSidebarPreviewFileChange',
				handleSidebarPreviewFileChange
			);
			controller.eventListener.unregister('onSidebarFileDeleted', handleSidebarFileDeleted);
			controller.eventListener.unregister('onSidebarDirDeleted', handleSidebarDirDeleted);
			controller.eventListener.unregister('onSidebarNodeMoved', handleSidebarNodeMoved);
		};
	});

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
					canvas.setAttribute('ttc-page-id', i.toString());
					canvasContainer.appendChild(canvas);
					const backPanel = document.createElement('div');
					backPanel.style.backgroundColor = 'white';
					backPanel.style.position = 'absolute';
					backPanel.style.zIndex = '-1';

					if (canvas) {
						backPanel.style.top = `${canvas.offsetTop}px`;
						backPanel.style.left = `${canvas.offsetLeft}px`;
						canvas.parentElement?.insertBefore(backPanel, canvas);
					}

					backPanels.set(i, { target: backPanel, dim: { width: 0, height: 0} });
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

	function rendererMessageHandler(message: App.PageRenderer.Response) {
		if (message.type === 'render-success') {
			const { type, pageId, dimensions } = message;
			const canv = canvasContainer.querySelector(`[ttc-page-id="${pageId}"]`) as HTMLCanvasElement | null;
			if (backPanels.has(pageId)) {
				const backPanel = backPanels.get(pageId)!;
				if (backPanel.dim.width !== dimensions.width || backPanel.dim.height !== dimensions.height) {
					backPanel.dim = dimensions;
					backPanel.target.style.width = `${dimensions.width}px`;
					backPanel.target.style.height = `${dimensions.height}px`;
				}
				if (canv) {
					setTimeout(() => {
						canv.style.display = 'block';
						backPanel.target.style.top = `${canv.offsetTop}px`;
						backPanel.target.style.left = `${canv.offsetLeft}px`;
					}, 100);
				}
			}
		}
	}

	function resizeBackpanels() {
		for (const [i, backPanel] of backPanels.entries()) {
			const canvas = canvasContainer.querySelector(`[ttc-page-id="${i}"]`) as HTMLCanvasElement | null;
			let { width: last_width, height: last_height } = backPanel.dim;
			const factor = (maxWidth / last_width) * previewScale;
			if (canvas) {
				backPanel.target.style.width = `${last_width * factor}px`;
				backPanel.target.style.height = `${last_height * factor}px`;
			}
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
		resizeBackpanels();
	}

	function canvasLoad(node: HTMLDivElement) {
		let isDown = false;
		let startX: number;
		let startY: number;
		let scrollLeft: number;
		let scrollTop: number;

		function getScrollBarWidth() {
			let el = document.createElement("div");
			el.style.cssText = "overflow:scroll; visibility:hidden; position:absolute;";
			document.body.appendChild(el);
			let width = el.offsetWidth - el.clientWidth;
			el.remove();
			return width;
		}

		function updateCanvasSize(subtractScrollBar: boolean = false) {
				node.style.gap = `${previewScale * convertRemToPixels(5)}px`;
				node.style.padding = `${previewScale * convertRemToPixels(4)}px`;

				let styles = getComputedStyle(node);

				let innerWidth =
					parseFloat(styles.width) -
					parseFloat(styles.paddingLeft) -
					parseFloat(styles.paddingRight);
				
				if (node.scrollHeight > node.clientHeight && subtractScrollBar) {
					innerWidth -= getScrollBarWidth();
				}

				maxWidth = innerWidth;
				canvasContainer.querySelectorAll(`canvas`).forEach((canvas) => {
					canvas.style.display = 'none';
				});
				updateDebouncer();
				// renderer?.update(-1, innerWidth);
				resizeBackpanels();
		}

		$effect(() => {
			let resizeObserver = new ResizeObserver(async (entrys, observer) => { //TODO: Provide option to lock size to window
				updateCanvasSize(true);
			});

			async function init() {
				await waitForInit;
				updateCanvasSize();

				resizeObserver.observe(node);
			}
			init();

			node.addEventListener('wheel', (e) => {
				if (e.ctrlKey) {
					e.preventDefault();
					
					previewScale += e.deltaY > 0 ? -0.1 : 0.1;
					if (previewScale < ZOOM_OUT_LIMIT) {
						previewScale = ZOOM_OUT_LIMIT;
					} else if (previewScale > ZOOM_IN_LIMIT) {
						previewScale = ZOOM_IN_LIMIT;
					} else {
						zoomPreview();
					}
				}
			});

			// drag scroll
			node.addEventListener('mousedown', (e) => {
				isDown = true;
				startX = e.pageX - node.offsetLeft;
				startY = e.pageY - node.offsetTop;
				scrollLeft = node.scrollLeft;
				scrollTop = node.scrollTop;
			});

			node.addEventListener('mouseleave', () => {
				isDown = false;
			});

			node.addEventListener('mouseup', () => {
				isDown = false;
			});

			node.addEventListener('mousemove', (e) => {
				if (!isDown) return;
				e.preventDefault();
				const x = e.pageX - node.offsetLeft;
				const y = e.pageY - node.offsetTop;
				const walkX = (x - startX) * 2; //scroll-fast
				const walkY = (y - startY) * 2; //scroll-fast
				node.scrollLeft = scrollLeft - walkX;
				node.scrollTop = scrollTop - walkY;
			});

			return () => {
				node.removeEventListener('wheel', (e) => {});
				node.removeEventListener('mousedown', (e) => {});
				node.removeEventListener('mouseleave', () => {});
				node.removeEventListener('mouseup', () => {});
				node.removeEventListener('mousemove', (e) => {});
				resizeObserver.disconnect();
			};
		});
	}

	function onDidChangeModelContent(
		model: monaco.editor.ITextModel,
		e: monaco.editor.IModelContentChangedEvent
	) {
		const content = model.getValue();
		const path = model.uri.path;
		console.log('Content changed', path);

		controller.vfs.writeFile(path, content);
	}
</script>

{#snippet emptyEditor()}
	<div class="flex h-full w-full flex-col items-center justify-center">
		<div>
			<FileQuestion class="mb-6 size-20 text-primary" />
		</div>
		<h2 class="mb-4 text-center text-3xl font-bold">Oops! This Space Looks Empty</h2>
		<p class="mb-8 max-w-md text-center text-muted-foreground">
			Looks like your code took a break. D on't worry, <span class="italic underline">click</span>
			on a file on the left to get started or create a new file for all your
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
						if (previewScale < ZOOM_IN_LIMIT) {
							previewScale += 0.1;
							zoomPreview();
						}
					}}
				>
					Zoom In
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						if (previewScale > ZOOM_OUT_LIMIT) {
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

{#if controller.loading.loading}
	<div
		class="absolute left-0 top-0 z-50 flex h-screen w-screen items-center justify-center bg-background"
		transition:fade
	>
		<div class="flex flex-col items-center justify-center">
			<LoaderCircle class="animate-spin" />
			<p class="text-center">{controller.loading.message}...</p>
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
			<div
				class={`flex pl-2 ${controller.vfs.currentlyOpen.length === 0 ? 'min-h-0' : 'min-h-10 border-b'}`}
			>
				{#each controller.vfs.currentlyOpen as entry}
					<Button
						size="sm"
						variant="outline"
						class={`h-full rounded-none border-b-0 border-l-0 border-r text-sm ${!entry.mutated ? 'italic' : ''} ${controller.editorModelUri === entry.file.path ? 'border-t-2 border-t-purple-300 bg-accent' : ''}`}
						onclick={() => {
							if (entry.open.isOpen) {
								controller.openFile(entry.file.path);
							}
						}}
					>
						{entry.file.name}
						<span class="text-muted-foreground">
							{#if entry.getParentName() !== ''}
								{entry.getParentName()}
							{/if}
						</span>
						<button
							class="rounded-md p-0.5 hover:bg-slate-600"
							onclick={() => {
								controller.closeFile(entry.file.path);
							}}
						>
							<X />
						</button>
					</Button>
				{/each}
			</div>
			<Editor children={emptyEditor} />
		</div>
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane collapsedSize={0} collapsible={true} minSize={15}>
		<div
			id="canvas-container"
			bind:this={canvasContainer}
			use:canvasLoad
			role="presentation"
			class="flex h-full w-full flex-col items-start overflow-x-auto overflow-y-auto relative"
		></div>
	</Resizable.Pane>
</Resizable.PaneGroup>

<style>
	:global(.typst-doc) {
		width: 100% !important;
		height: 100% !important;
	}
</style>
