<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { getLayoutStore } from '$lib/stores/layoutStore.svelte';
	// import { editor as meditor } from 'monaco-editor';
	import type { PageData } from './$types';
	import PageRenderWorker from '$lib/workers/page_renderer?url';
	import CompilerWorker from '$lib/workers/compiler?worker';
	import { CompilerWorkerBridge, PageRendererWorkerBridge } from '$lib/workerBridges';
	import {
		getLogger,
		Logger,
		MainMonacoSection,
		MainWSFlowerSection,
		WASMSection,
		WorkerRendererSection
	} from '$lib/stores/logger.svelte';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import { fade, scale } from 'svelte/transition';
	import { LoaderCircle } from 'lucide-svelte';
	import { TypstCompletionProvider } from '$lib/monaco';
	import { convertRemToPixels, debounce, PreviewDragger } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import { untrack } from 'svelte';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import { ServerCrash } from 'lucide-svelte';
	import { Server } from 'lucide-svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface FlowerState {
		connected: boolean;
		status: 'connected' | 'reconnecting' | 'failed';
		reconnectingAttempts: number;
		maxReconnectAttempts: number;
		curTimeout: Timer | null;
	}

	interface RawOperation {
		range: {
			startLineNumber: number;
			startColumn: number;
			endLineNumber: number;
			endColumn: number;
		};
		text: string;
	}

	interface VFSFile {
		content: string;
		model: Monaco.editor.ITextModel;
		open?: boolean;
	}

	interface Page {
		// canvas: HTMLCanvasElement;
		svg?: string;
		dimensions: { width: number; height: number };
	}

	class ProjectAppState {
		vfs: SvelteMap<string, VFSFile> = new SvelteMap();
		monaco?: typeof Monaco;
		pages: Page[] = $state([]);
		logger: Logger;
		typstCompletionProvider?: TypstCompletionProvider;
		currentModel: string = '';

		constructor() {
			this.logger = getLogger();
			this.logger.logConsole(true);
		}

		getFirstModel() {
			return this.vfs.values().next().value?.model;
		}

		getCurrentFile() {
			return this.vfs.get(this.currentModel);
		}

		getCurrentName() {
			return this.currentModel;
		}

		getPageCount() {
			return this.pages.length;
		}

		slicePages(last_index: number) {
			this.pages = this.pages.slice(0, last_index);
		}

		setPage(index: number, page: Page) {
			this.pages[index] = page;
		}

		setPageDimensions(index: number, dimensions: { width: number; height: number }) {
			this.pages[index].dimensions = dimensions;
		}

		getPage(index: number) {
			return this.pages[index];
		}

		updatePageSvg(index: number, svg: string) {
			this.pages[index].svg = svg;
		}

		get openFiles() {
			// return [{ name: string, file: VFSFile }]
			return Array.from(this.vfs.entries()).filter(([n, f]) => f.open).map(([name, file]) => {
				return { name, model: file.model };
			});
		}
	}

	const projectState = new ProjectAppState();

	// Sveltekit
	const layoutStore = getLayoutStore(); // For Menu and things
	// const LOGGER = getLogger();
	// projectState.logger.logConsole(true);
	let loading = $state(true);
	let loadMessage = $state('Initializing the project');

	// *Workers*
	// Compiler
	let compiler: CompilerWorkerBridge;

	// Preview Renderer
	let pageRenderer: PageRendererWorkerBridge;
	let previewScale = $state(1); // Zoom level
	let canvasContainer: HTMLDivElement;
	// let pagePngs: { src: string; dimensions: { width: number; height: number } }[] = $state([]);
	let previewDragger: PreviewDragger;

	// Editor stuff
	// let monaco: typeof Monaco;
	let editorAnchor: HTMLDivElement;
	let editor: Monaco.editor.IStandaloneCodeEditor;
	// let vfs: { name: string; content: string; model: projectState.monaco.editor.ITextModel }[] = $state([]);
	let currentModelId = 0;
	let collectedEditorUpdates: any[] = []; // Editor text changes
	let flowerState: FlowerState = $state({
		connected: false,
		status: 'connected',
		reconnectingAttempts: 0,
		maxReconnectAttempts: 10,
		curTimeout: null
	});

	async function render() {
		if (loading) {
			loading = false;
		}
		compiler?.compile();
	}

	const update_bouncer = debounce(() => {
		flowerServer.send(
			'EDIT ' +
				JSON.stringify(
					collectedEditorUpdates
						.flat()
						.sort((a, b) => a.rangeOffset - b.rangeOffset) as RawOperation[]
				)
		);
		for (let change of collectedEditorUpdates.flat()) {
			try {
				projectState.logger.info(
					MainMonacoSection,
					'Applying change',
					change,
					projectState.getCurrentName()
				);

				compiler?.edit(
					projectState.currentModel,
					change.text,
					change.rangeOffset,
					change.rangeOffset + change.rangeLength
				);
			} catch (e) {
				projectState.logger.error(MainMonacoSection, 'Error applying change', e);
			}
		}
		projectState.logger.info(
			MainMonacoSection,
			'Content changed',
			collectedEditorUpdates.map((v) => v[0]) as RawOperation[]
		);
		collectedEditorUpdates = [];
		render();
	});

	function zoomPreview() {
		/* if (previewScale > 1.2) {
			projectState.logger.info(WorkerRendererSection, 'Zooming to', previewScale);
			pageRenderer?.resize(-1, previewScale);
		} */

		canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
		canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;

		if (previewScale < 1 && canvasContainer.style.alignItems !== 'center') {
			canvasContainer.style.alignItems = 'center';
		} else {
			if (previewScale >= 1 && canvasContainer.style.alignItems !== 'start') {
				canvasContainer.style.alignItems = 'start';
			}
		}

		pageRenderer?.resize(-1, previewScale);
		/* for (let i = 0; i < projectState.getPageCount(); i++) {
			pageRenderer?.rerender(i);
		} */
	}

	function onWheel(e: WheelEvent) {
		if (e.ctrlKey) {
			e.preventDefault();

			let factor = 0;
			const MIN_SCALE = 0.6;
			const MAX_SCALE = 2;

			if (e.deltaY > 0) {
				// Zoom out
				if (previewScale > MIN_SCALE) {
					factor = -0.1;
				}
			} else {
				// Zoom in
				if (previewScale < MAX_SCALE) {
					factor = 0.1;
				}
			}

			// Only update if there's a meaningful change
			if (factor !== 0) {
				const newScale = previewScale + factor;

				// Ensure the new scale is within bounds
				if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
					previewScale = newScale;

					zoomPreview();
				}
			}
		}
	}

	function handleCompileErrorResponse(response: App.Compiler.CompileErrorResponse) {
		const errs = response.errors;

		const convertedErrs = [];
		const markers = [];

		const model = projectState.getCurrentFile()!.model;
		console.log(model);

		for (let err of errs) {
			convertedErrs.push(err);

			const start_position = model.getPositionAt(err.span.range[0]);
			const end_position = model.getPositionAt(err.span.range[1]);

			const modelRange = projectState.monaco!.Range.fromPositions(start_position, end_position);

			let marker = {
				severity:
					err.severity === 'error'
						? projectState.monaco!.MarkerSeverity.Error
						: projectState.monaco!.MarkerSeverity.Warning,
				message: err.message,
				startLineNumber: modelRange.startLineNumber,
				startColumn: modelRange.startColumn,
				endLineNumber: modelRange.endLineNumber,
				endColumn: modelRange.endColumn
			};

			markers.push(marker);
		}

		projectState.monaco?.editor.setModelMarkers(model, 'compiler', markers);
	}

	function handleCompileResponse(response: App.Compiler.CompileResponse) {
		const compiled = response.svgs;

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

				pageRenderer?.initPage(i, offscreen, svg);
				projectState.logger.info(WorkerRendererSection, 'Page', i, 'rendering');
			} else {
				projectState.updatePageSvg(i, svg);
				projectState.logger.info(WorkerRendererSection, 'Page', i, 'forcing rerender');
				pageRenderer?.rerender(i, svg);
			}
		}

		// Remove any extra pages
		if (projectState.getPageCount() > compiled.length) {
			projectState.slicePages(compiled.length);
		}

		const model = projectState.getCurrentFile()?.model;
		if (model) projectState.monaco?.editor.setModelMarkers(model, 'compiler', []);
	}

	function handleCompilerErrorResponse(response: App.Compiler.ErrorResponse) {
		switch (response.sub) {
			case 'default':
				projectState.logger.error(WASMSection, 'Error', response.error);
				break;
			case 'compile':
				handleCompileErrorResponse(response);
				break;
		}
	}

	function handleCompilerLoggerResponse(response: App.Compiler.LoggerResponse) {
		switch (response.severity) {
			case 'info':
				projectState.logger.info(WASMSection, ...response.message);
				break;
			case 'warn':
				projectState.logger.warn(WASMSection, ...response.message);
				break;
			case 'error':
				projectState.logger.error(WASMSection, ...response.message);
				break;
		}
	}

	function handleCompilerCompletionResponse(
		response: App.Compiler.CompletionResponse,
		completionProvider: TypstCompletionProvider
	) {
		completionProvider.setCompletions(response.completions);
	}

	function handleCompilerResponse(
		response: App.Compiler.Response,
		completionProvider: TypstCompletionProvider
	) {
		switch (response.type) {
			case 'error':
				handleCompilerErrorResponse(response);
				break;
			case 'completion':
				handleCompilerCompletionResponse(response, completionProvider);
				break;
			case 'compile':
				handleCompileResponse(response);
				break;
			case 'logger':
				handleCompilerLoggerResponse(response);
				break;
		}
	}

	function flowerConnectHandler() {
		flowerServer = new WebSocket('ws://localhost:3030/users');

		flowerServer.onopen = () => {
			flowerServer.send('INIT ' + data.project?.id);
			loadMessage = 'Painting the canvas like picasso';
			flowerState.connected = true;
			flowerState.status = 'connected';
		};

		flowerServer.onerror = (e) => {
			projectState.logger.error(MainWSFlowerSection, 'Websocket Error', e);
			flowerServer.close();
		};

		flowerServer.onclose = (e) => {
			flowerState.connected = false;
			flowerReconnectHandler();
		};

		flowerServer.onmessage = (e: MessageEvent<string>) => {
			projectState.logger.info(MainWSFlowerSection, `Websocket Message:`, e);
			if (e.data.startsWith('INIT ')) {
				projectState.vfs.get('main.typ')?.model.setValue(e.data.slice(5));
				try {
					compiler?.add_file('main.typ', e.data.slice(5));
					render();
					canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
					canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;
				} catch (e) {
					console.error(e);
				}

				setTimeout(() => {
					// add delay to prevent an echo
					projectState.vfs.get('main.typ')?.model.onDidChangeContent((e: any) => {
						onContentChanged(e);
					});
				}, 50);
			}
		};
	}

	function flowerReconnectHandler() {
		flowerState.reconnectingAttempts++;
		if (flowerState.reconnectingAttempts < flowerState.maxReconnectAttempts) {
			flowerState.status = 'reconnecting';
			flowerState.curTimeout = setTimeout(() => {
				flowerConnectHandler();
			}, 2000 * flowerState.reconnectingAttempts);
		} else {
			flowerState.status = 'failed';
		}
	}

	$effect(() => {
		layoutStore.setMenubarSnippet(menubar);
		projectState.logger.clearLogs();
		const completionProvider = new TypstCompletionProvider((file, offset) => {
			compiler?.completions(file, offset);
		});
		loadMessage = 'Loading WASM Flow';

		compiler = new CompilerWorkerBridge(new CompilerWorker());

		compiler.init('');

		compiler.onMessage((res) => handleCompilerResponse(res, completionProvider));

		pageRenderer = new PageRendererWorkerBridge(
			new Worker(PageRenderWorker, {
				type: 'module'
			})
		);

		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				const style = getComputedStyle(canvasContainer);

				const width =
					parseFloat(style.width) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
				pageRenderer!.update(-1, width);
			}
		});

		resizeObserver.observe(canvasContainer);
		setTimeout(() => {
			resizeObserver.unobserve(canvasContainer);
		}, 3000);

		pageRenderer.onMessage((msg) => {
			if (msg.type === 'error') {
				projectState.logger.error(WorkerRendererSection, 'Error Page Render Worker', msg.error);
			} else if (msg.type === 'render-success') {
				projectState.setPageDimensions(msg.pageId, msg.dimensions);

				/* const svg = document.getElementById(`preview-page-${msg.pageId}`);
				if (svg) {
					svg.style.width = `${msg.dimensions.width * previewScale}px`;
					svg.style.height = `${msg.dimensions.height * previewScale}px`;
				} */

				// projectState.setPageDimensions(msg.pageId, msg.dimensions);

				projectState.logger.info(WorkerRendererSection, 'Page', msg.pageId, 'finished!');
			}
		});

		console.log('Container', canvasContainer);

		previewDragger = new PreviewDragger(canvasContainer);

		document.addEventListener('wheel', onWheel, { passive: false });

		loadMessage = 'Loading Monaco Editor';

		import('$lib/monaco/editor')
			.then((iMonaco) => {
				projectState.monaco = iMonaco.default;
				iMonaco.initializeEditor(completionProvider).then((_editor) => {
					projectState.logger.info(MainMonacoSection, 'Editor initialized');
					editor = _editor;

					// Provide models for the vfs
					for (let file of data.initial_vfs) {
						let model = iMonaco.createModel(file.content);
						if (projectState.currentModel === '') {
							projectState.currentModel = file.filename;
						}
						projectState.vfs.set(file.filename, {
							content: file.content,
							model
						});
					}

					// Set the first model
					editor.setModel(projectState.getFirstModel()!);

					loadMessage = 'Connecting to Typst Flower Service';

					flowerConnectHandler();

					// Add the listeners
					/* editor.onDidChangeModelContent((e) => {
					onContentChanged(e);
				}); */
				});
			})
			.catch((e) => {
				projectState.logger.error(MainMonacoSection, 'Error initializing editor', e);
			});

		return () => {
			// Cleanup
			projectState.vfs.forEach((v) => {
				v.model.dispose();
			});
			editor?.dispose();
			flowerServer.close();
			document.removeEventListener('wheel', onWheel);
			previewDragger?.dispose();
		};
	});

	function onContentChanged(e: any) {
		update_bouncer();
		let changes = e.changes.map((v: any) => {
			return {
				rangeOffset: v.rangeOffset,
				rangeLength: v.rangeLength,
				text: v.text
			};
		});
		collectedEditorUpdates.push(changes);
	}

	let flowerServer: WebSocket;

	// Set the collapsible panes handles
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

	let delete_form: HTMLFormElement;

	let ctrl_down = $state(false);

	let { data }: { data: PageData } = $props();
</script>

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
				<Menubar.Item
					onclick={() => {
						delete_form.submit();
					}}
				>
					Delete Project
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger>Websocket</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item
					onclick={() => {
						console.log('Connect');
					}}
				>
					Connect
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						console.log('Disconnect');
						flowerServer.close();
					}}
				>
					Disconnect
				</Menubar.Item>
				<Menubar.Item
					onclick={() => {
						console.log('Send');
						flowerServer.send(
							'EDIT ' +
								JSON.stringify({
									text: 'hello',
									range: {
										startLineNumber: 1,
										startColumn: 1,
										endLineNumber: 1,
										endColumn: 5
									}
								})
						);
					}}
				>
					Send
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
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger class={buttonVariants({ variant: 'outline', size: 'icon' })} onclick={() => {
				if (flowerState.status === 'failed') {
					flowerConnectHandler();
				}
			}}>
				{#if flowerState.connected}
					<div class="relative">
						<Server />
						<span class="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
					</div>
				{:else}
					<div class="relative">
						<ServerCrash />
						<span
							class={`absolute bottom-0 right-0 p-1 ${flowerState.status === 'reconnecting' ? 'bg-orange-500' : 'bg-destructive'} h-1.5 w-1.5 rounded-full`}
						>
						</span>
					</div>
				{/if}
				</Tooltip.Trigger
			>
			<Tooltip.Content>
				{#if flowerState.connected}
					<p>Connected to Typst Flower Service</p>
				{:else if flowerState.status === 'reconnecting'}
					<p>Reconnecting to Typst Flower Service...</p>
					<p>Attempt {flowerState.reconnectingAttempts}</p>
				{:else}
					<p>Failed to connect to Typst Flower Service</p>
					<p>Click to retry</p>
				{/if}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/snippet}

{#if loading}
	<div
		class="absolute left-0 top-0 z-50 flex h-screen w-screen items-center justify-center bg-background"
		transition:fade
	>
		<div class="flex flex-col items-center justify-center">
			<LoaderCircle class="animate-spin" />
			<p class="text-center">{loadMessage}...</p>
			{#if flowerState.status === 'reconnecting'}
				<p>Attempt {flowerState.reconnectingAttempts}</p>
			{:else if flowerState.status === 'failed'}
				<p>Failed to connect to Typst Flower Service</p>
			{/if}
		</div>
	</div>
{/if}

<form
	method="POST"
	action="?/delete"
	id="editor-form"
	bind:this={delete_form}
	class="hidden"
></form>
<Resizable.PaneGroup direction="horizontal" autoSaveId="ideLayout" class="w-full">
	<Resizable.Pane
		defaultSize={50}
		collapsedSize={0}
		collapsible={true}
		minSize={15}
		bind:this={panes.editor.obj}
		class=""
	>
	<div class="flex gap-2">
		{#each projectState.openFiles as file}
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					projectState.currentModel = file.name;
					editor.setModel(file.model);
				}}
			>
				{file.name}
			</Button>
		{/each}
	</div>
		<div bind:this={editorAnchor} id="editor" class="h-full w-full"></div>
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane collapsedSize={0} collapsible={true} minSize={15}>
		<div
			id="canvas-container"
			bind:this={canvasContainer}
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
