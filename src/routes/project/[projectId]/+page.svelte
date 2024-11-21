<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { getProjectStore } from '$lib/stores/project.svelte';
	// import { editor as meditor } from 'monaco-editor';
	import type { PageData } from './$types';
	import init, * as typst from '$rust/typst_flow_wasm';
	import PageRenderWorker from '$lib/workers/page_renderer?url';
	import { IndexedDBFileStorage } from '$lib/indexeddb';

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

	let canvases: { canvas: HTMLCanvasElement; normal_width: number; ratio: number }[] = $state([]);
	const store = getProjectStore();
	let editor: any = null;
	let vfs: { name: string; content: string; model: any }[] = $state([]);
	let currentModelId = 0;
	let compiler: typst.SuiteCore;
	let canvasContainer: HTMLDivElement;
	let previewScale = $state(1);
	let page_render_worker: undefined | Worker;

	function xml_get_sync(path: string) {
		const request = new XMLHttpRequest();
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.open('GET', path, false);
		request.send(null);

		if (
			request.status === 200 &&
			(request.response instanceof String || typeof request.response === 'string')
		) {
			return Uint8Array.from(request.response, (c: string) => c.charCodeAt(0));
		}
		return Uint8Array.from([]);
	}

	async function render(recompile: boolean = true) {
		for (const [i, svg] of compiler.compile().entries()) {
			if (canvases.length <= i) {
				let canvas = document.createElement('canvas');
				canvasContainer.appendChild(canvas);
				const offscreen = canvas.transferControlToOffscreen();

				page_render_worker!.postMessage(
					{
						type: 'render',
						svg,
						canvas: offscreen,
						pageId: i,
						recompile
					} as App.IPageRenderMessage,
					[offscreen]
				);

				canvases.push({ canvas, normal_width: canvas.clientWidth, ratio: 0 });
			} else {
				page_render_worker!.postMessage({
					type: 'render',
					svg,
					pageId: i,
					recompile
				} as App.IPageRenderMessage);
			}
		}
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
				console.log('Applying change', change, vfs[currentModelId].name);

				compiler.edit(
					vfs[currentModelId].name,
					change.text,
					change.rangeOffset,
					change.rangeOffset + change.rangeLength
				);
			} catch (e) {
				console.error(e);
			}
		}
		console.log('Content changed', accumulatedChanges.map((v) => v[0]) as RawOperation[]);
		accumulatedChanges = [];
		render();
	});
	let accumulatedChanges: any[] = [];

	function convertRemToPixels(rem: number) {
		return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
	}

	function zoomPreview() {
		for (let i = 0; i < canvases.length; i++) {
			const normal_width = canvases[i].normal_width;
			const new_width = normal_width * previewScale;

			page_render_worker!.postMessage({
				type: 'resize',
				pageId: i,
				resizeArgs: {
					width: new_width,
					height: new_width * canvases[i].ratio
				}
			} as App.IPageRenderMessage);
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

		render(false);
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

	$effect(() => {
		page_render_worker = new Worker(PageRenderWorker, {
			type: 'module'
		});

		page_render_worker.onmessage = (e: MessageEvent<App.IPageRenderResponse>) => {
			const msg = e.data;
			if (msg.type === 'error') {
				console.log('Error Page Render Worker', msg.error);
			} else {
				const infos = msg.canvasInfos;
				if (!infos || infos.width === 0) {
					return;
				}

				console.log('Page', infos.pageId, 'finished! Width:', infos.width);
				const canvas = canvases[infos.pageId].canvas;

				canvases[infos!.pageId].normal_width = canvas.clientWidth; // update the canvas width
				canvases[infos!.pageId].ratio = canvas.clientHeight / canvas.clientWidth; // update the ratio (reversed)
			}
		};

		(window as any).xml_get_sync = xml_get_sync;
		document.addEventListener('wheel', onWheel, { passive: false });

		init().then(() => {
			compiler = new typst.SuiteCore('');

			import('$lib/editor').then(({ EditorSetup, initializeEditor, createModel }) => {
				initializeEditor(compiler).then((_editor) => {
					console.log('Editor initialized');
					editor = _editor;

					// Provide models for the vfs
					for (let file of data.initial_vfs) {
						let model = createModel(file.content);
						vfs.push({
							name: file.filename,
							content: file.content,
							model
						});
					}

					// Set the first model
					editor.setModel(vfs[0].model);

					ws = new WebSocket('ws://localhost:3030/users');
					ws.onopen = () => {
						ws.send('INIT ' + data.project?.id);
					};
					ws.onerror = (e) => {
						// TODO: HANDLE ERROR
						console.log('Websocket Error', e);
					};
					ws.onmessage = (e: MessageEvent<string>) => {
						console.log(e.data);
						if (e.data.startsWith('INIT ')) {
							vfs[0].model.setValue(e.data.slice(5));
							try {
								compiler.add_file('main.typ', e.data.slice(5));
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
			});
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
		
		</div>
	</Resizable.Pane>
</Resizable.PaneGroup>
