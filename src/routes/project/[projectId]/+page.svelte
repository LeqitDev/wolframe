<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { getProjectStore } from '$lib/stores/project.svelte';
	// import { editor as meditor } from 'monaco-editor';
	import type { PageData } from './$types';
	import init, * as typst from '$rust/typst_flow_wasm';
	import PageRenderWorker from '$lib/workers/page_renderer?url';
	import CompilerWorker from '$lib/workers/compiler?worker';
	import { IndexedDBFileStorage } from '$lib/indexeddb';
	import { CompilerWorkerBridge, PageRendererWorkerBridge } from '$lib';
	import { getLogger, MainMonacoSection, MainWSFlowerSection, WASMSection, WorkerRendererSection } from '$lib/logger.svelte';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import { fade, scale } from 'svelte/transition';
	import { LoaderCircle } from 'lucide-svelte';
	import { TypstCompletionProvider, type CoreCompletionItem, CoreCompletionKinds, convertToMonacoSnippet } from '$lib/monaco';
	// import { MarkerSeverity, Range } from 'monaco-editor';

	const LOGGER = getLogger();
	LOGGER.logConsole(true);

	const debounce = (func: Function, wait: number = 300) => {
		let timeout: any;
		return (...args: any) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(this, ...args);
			}, wait);
		};
	};

	interface RawOperation {
		range: {
			startLineNumber: number;
			startColumn: number;
			endLineNumber: number;
			endColumn: number;
		};
		text: string;
	}

	let divEl: HTMLDivElement;

	let pagePngs: {src: string; dimensions: {width: number; height: number;}}[] = $state([]);
	const store = getProjectStore();
	let editor: any = null;
	let vfs: { name: string; content: string; model: Monaco.editor.ITextModel }[] = $state([]);
	let currentModelId = 0;
	let compiler: undefined | CompilerWorkerBridge;
	let canvasContainer: HTMLDivElement;
	let previewScale = $state(1);
	let pageRenderer: undefined | PageRendererWorkerBridge;
	let monaco: typeof Monaco;
	let loading = $state(true);
	let loadMessage = $state('Initializing the project');

	

	async function render(recompile: boolean = true) {
		if (loading) {
			loading = false;
		}
		compiler?.compile();
	}

	const update_bouncer = debounce(() => {
		ws.send(
			'EDIT ' +
				JSON.stringify(
					accumulatedChanges.flat().sort((a, b) => a.rangeOffset - b.rangeOffset) as RawOperation[]
				)
		);
		for (let change of accumulatedChanges.flat()) {
			try {
				LOGGER.info(MainMonacoSection, 'Applying change', change, vfs[currentModelId].name);

				compiler?.edit(
					vfs[currentModelId].name,
					change.text,
					change.rangeOffset,
					change.rangeOffset + change.rangeLength
				);
			} catch (e) {
				LOGGER.error(MainMonacoSection, 'Error applying change', e);
			}
		}
		LOGGER.info(MainMonacoSection, 'Content changed', accumulatedChanges.map((v) => v[0]) as RawOperation[]);
		accumulatedChanges = [];
		render();
	});
	let accumulatedChanges: any[] = [];

	function convertRemToPixels(rem: number) {
		return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
	}

	function zoomPreview() {
		
		if (previewScale > 1.2) {
			LOGGER.info(WorkerRendererSection, 'Zooming to', previewScale);
			pageRenderer?.resize(-1, previewScale);
		}

		canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
		canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;

		if (previewScale < 1 && canvasContainer.style.alignItems !== 'center') {
			canvasContainer.style.alignItems = 'center';
		} else {
			if (previewScale >= 1 && canvasContainer.style.alignItems !== 'start') {
				canvasContainer.style.alignItems = 'start';
			}
		}

		// render(false);
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

	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let scrollLeft = 0;
	let scrollTop = 0;

	function onMouseDown(e: MouseEvent) {
		isDragging = true;
		startX = e.pageX - canvasContainer.offsetLeft;
		startY = e.pageY - canvasContainer.offsetTop;
		scrollLeft = canvasContainer.scrollLeft;
		scrollTop = canvasContainer.scrollTop;

		e.preventDefault();
	}

	function onMouseUp(e: MouseEvent) {
		isDragging = false;
	}

	function onMouesMove(e: MouseEvent) {
		if (!isDragging) return;

		const x = e.pageX - canvasContainer.offsetLeft;
		const y = e.pageY - canvasContainer.offsetTop;

		const walkX = (x - startX) * 2;
		const walkY = (y - startY) * 2;

		canvasContainer.scrollLeft = scrollLeft - walkX;
		canvasContainer.scrollTop = scrollTop - walkY;
	}

	function handleCompileErrorResponse(response: App.Compiler.CompileErrorResponse) {
		const errs = response.errors;

			const convertedErrs = [];
			const markers = [];

			const model = vfs[currentModelId].model;
			console.log(model);
			

			for (let err of errs) {
				convertedErrs.push(err);

				const start_position = model.getPositionAt(err.span.range[0]);
				const end_position = model.getPositionAt(err.span.range[1]);
			
				const modelRange = monaco.Range.fromPositions(start_position, end_position);

				let marker = {
					severity: err.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
					message: err.message,
					startLineNumber: modelRange.startLineNumber,
					startColumn: modelRange.startColumn,
					endLineNumber: modelRange.endLineNumber,
					endColumn: modelRange.endColumn
				};

				markers.push(marker);
			}

			monaco.editor.setModelMarkers(model, 'compiler', markers);
	}

	function handleCompileResponse(response: App.Compiler.CompileResponse) {
		const compiled = response.svgs;

		for (const [i, svg] of compiled.entries()) {
			if (pagePngs.length <= i) {
				pageRenderer?.rerender(i, svg);
				LOGGER.info(WorkerRendererSection, 'Page', i, 'rendering');
			} else {
				LOGGER.info(WorkerRendererSection, 'Page', i, 'forcing rerender');
				pageRenderer?.rerender(i, svg);
			}
		}

		// Remove any extra pages
		if (pagePngs.length > compiled.length) {
			pagePngs = pagePngs.slice(0, compiled.length);
		}

		monaco.editor.setModelMarkers(vfs[currentModelId].model, 'compiler', []);
	}

	function handleCompilerErrorResponse(response: App.Compiler.ErrorResponse) {
		switch (response.sub) {
			case 'default':
				LOGGER.error(WASMSection, 'Error', response.error);
				break;
			case 'compile':
				handleCompileErrorResponse(response);
				break;
		}
	}

	function handleCompilerLoggerResponse(response: App.Compiler.LoggerResponse) {
		switch (response.severity) {
			case 'info':
				LOGGER.info(WASMSection, ...response.message);
				break;
			case 'warn':
				LOGGER.warn(WASMSection, ...response.message);
				break;
			case 'error':
				LOGGER.error(WASMSection, ...response.message);
				break;
		}
	}

	function handleCompilerCompletionResponse(response: App.Compiler.CompletionResponse, completionProvider: TypstCompletionProvider) {
		
		completionProvider.setCompletions(response.completions);
	}

	function handleCompilerResponse(response: App.Compiler.Response, completionProvider: TypstCompletionProvider) {
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


	$effect(() => {
		LOGGER.clearLogs();
		const completionProvider = new TypstCompletionProvider(
			(file, offset) => {
				compiler?.completions(file, offset);
			}
		);
		loadMessage = 'Loading WASM Flow';

		compiler = new CompilerWorkerBridge(new CompilerWorker());

		compiler.init('');

		compiler.onMessage((res) => handleCompilerResponse(res, completionProvider));


		pageRenderer = new PageRendererWorkerBridge(new Worker(PageRenderWorker, {
			type: 'module'
		}));

		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				const style = getComputedStyle(canvasContainer);

				const width = parseFloat(style.width) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
				pageRenderer!.update(-1, width);
			}
		});

		resizeObserver.observe(canvasContainer);

		pageRenderer.onMessage((msg) => {
			if (msg.type === 'error') {
				LOGGER.error(WorkerRendererSection, 'Error Page Render Worker', msg.error);
			} else if (msg.type === 'render-success') {
				pagePngs[msg.pageId] = {
					src: msg.png,
					dimensions: msg.dimensions
				}

				LOGGER.info(WorkerRendererSection, 'Page', msg.pageId, 'finished!');
			}
		});

		document.addEventListener('wheel', onWheel, { passive: false });

		loadMessage = 'Loading Monaco Editor';

		import('$lib/editor').then((iMonaco) => {
				monaco = iMonaco.default;
				iMonaco.initializeEditor(completionProvider).then((_editor) => {
					LOGGER.info(MainMonacoSection, 'Editor initialized');
					editor = _editor;

					// Provide models for the vfs
					for (let file of data.initial_vfs) {
						let model = iMonaco.createModel(file.content);
						vfs.push({
							name: file.filename,
							content: file.content,
							model
						});
					}

					// Set the first model
					editor.setModel(vfs[0].model);

					loadMessage = 'Connecting to Typst Flower Service';

					ws = new WebSocket('ws://localhost:3030/users');
					ws.onopen = () => {
						ws.send('INIT ' + data.project?.id);
						loadMessage = 'Painting the canvas like picasso';
					};
					ws.onerror = (e) => {
						// TODO: HANDLE ERROR
						LOGGER.error(MainWSFlowerSection, 'Websocket Error', e);
					};
					ws.onmessage = (e: MessageEvent<string>) => {
						LOGGER.info(MainWSFlowerSection, `Websocket Message: """${e.data}"""`);
						if (e.data.startsWith('INIT ')) {
							vfs[0].model.setValue(e.data.slice(5));
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
								vfs[0].model.onDidChangeContent((e: any) => {
									onContentChanged(e);
								});
							}, 50);
						}
					};

					// Add the listeners
					/* editor.onDidChangeModelContent((e) => {
					onContentChanged(e);
				}); */
				});
			}).catch((e) => {
				LOGGER.error(MainMonacoSection, 'Error initializing editor', e);
			});

		return () => {
			// Cleanup
			editor?.dispose();
			ws.close();
			document.removeEventListener('wheel', onWheel);
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
		accumulatedChanges.push(changes);
	}

	// ONLY TEST
	let ws: WebSocket;

	// Set the menu
	$effect(() => {
		store.setMenu([
			{
				name: 'Window',
				actions: [
					{
						name: `${panes.editor.obj?.isCollapsed() ? 'Show' : 'Hide'} Editor`,
						onclick: () => {
							if (panes.editor.obj?.isCollapsed()) {
								panes.editor.obj?.expand();
							} else {
								panes.editor.obj?.collapse();
							}
						}
					},
					{
						name: `${panes.preview.obj?.isCollapsed() ? 'Show' : 'Hide'} Preview`,
						onclick: () => {
							if (panes.preview.obj?.isCollapsed()) {
								panes.preview.obj?.expand();
							} else {
								panes.preview.obj?.collapse();
							}
						}
					}
				]
			},
			{
				name: 'Project',
				actions: [
					{
						name: 'Delete Project',
						onclick: () => {
							// console.log('Delete project');
							delete_form.submit();
						}
					}
				]
			},
			{
				name: 'Websocket',
				actions: [
					{
						name: 'Connect',
						onclick: () => {
							console.log('Connect');
						}
					},
					{
						name: 'Disconnect',
						onclick: () => {
							console.log('Disconnect');
							ws.close();
						}
					},
					{
						name: 'Send',
						onclick: () => {
							console.log('Send');
							ws.send(
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
						}
					}
				]
			},
			{
				name: 'Preview',
				actions: [
					{
						name: 'Zoom In',
						onclick: () => {
							if (previewScale < 2) {
								previewScale += 0.1;
								zoomPreview();
							}
						}
					},
					{
						name: 'Zoom Out',
						onclick: () => {
							if (previewScale > 0.6) {
								previewScale -= 0.1;
								zoomPreview();
							}
						}
					},
					{
						name: 'Reset Zoom',
						onclick: () => {
							previewScale = 1;
							zoomPreview();
						}
					}
				]
			}
		]);
	});

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

{#if loading}
	<div class="absolute top-0 left-0 w-screen h-screen flex items-center justify-center bg-background z-50" transition:fade>
		<div class="flex flex-col justify-center items-center">
			<LoaderCircle class="animate-spin" />
			<p class="text-center">{loadMessage}...</p>
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
		<div bind:this={divEl} id="editor" class="h-full w-full"></div>
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane collapsedSize={0} collapsible={true} minSize={15}>
		<div
			bind:this={canvasContainer}
			onmousedown={onMouseDown}
			onmouseup={onMouseUp}
			onmousemove={onMouesMove}
			onmouseleave={onMouseUp}
			role="presentation"
			class="flex h-full w-full flex-col items-start overflow-x-auto overflow-y-auto"
		>
			{#each pagePngs as png, i}
				<img
					src={png.src}
					alt={`Page ${i}`}
					class="rounded-sm shadow-2xl shadow-slate-500 max-w-none"
					style={`width: ${png.dimensions.width * previewScale}px; height: ${png.dimensions.height * previewScale}px;`}
				/>
			{/each}
		</div>
	</Resizable.Pane>
</Resizable.PaneGroup>
