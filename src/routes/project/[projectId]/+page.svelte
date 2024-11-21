<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { getProjectStore } from '$lib/stores/project.svelte';
	// import { editor as meditor } from 'monaco-editor';
	import type { PageData } from './$types';
	import init, * as typst from '$rust/typst_flow_wasm';
	import { Canvg } from 'canvg';

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

	let pages = $state(['']);
	let canvases: {canvg: Canvg, canvas: HTMLCanvasElement}[] = $state([]);
	const store = getProjectStore();
	let editor: any = null;
	let vfs: { name: string; content: string; model: any }[] = $state([]);
	let currentModelId = 0;
	let compiler: typst.SuiteCore;
	let canvasContainer: HTMLDivElement;
	let previewScale = $state(1);

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
				const ctx = canvas.getContext('2d');
				canvasContainer.appendChild(canvas);
				let canvg = await Canvg.from(ctx!, svg);
				canvg.render();
				
				canvases.push({canvg, canvas});
			} else {
				if (recompile) {
					const ctx = canvases[i].canvas.getContext('2d');
					canvases[i].canvg = await Canvg.from(ctx!, svg);
				}
				canvases[i].canvg.render();
			}
		}
	}

	const update_bouncer = debounce(() => {
		ws.send(
			'EDIT ' +
				JSON.stringify(
					accumulatedChanges
						.flat()
						.sort((a, b) => a.rangeOffset - b.rangeOffset) as RawOperation[]
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

	function onWheel(e: WheelEvent) {
		if (e.ctrlKey) {
			e.preventDefault();
			console.log('scale', previewScale);
			
			if (e.deltaY > 0 && previewScale > 0.1) {
				// Zoom out
				canvases.forEach((v) => {
					const new_width = v.canvas.clientWidth * 0.9;
					v.canvg.resize(new_width, undefined, true);
				});

				previewScale -= 0.1;
			} else {
				if (previewScale < 2) {
					// Zoom in
					canvases.forEach((v) => {
						const new_width = v.canvas.clientWidth * 1.1;
						v.canvg.resize(new_width, undefined, true);
					});

					previewScale += 0.1;
				}
			}
			render(false);
		}
	}

	$effect(() => {
		(window as any).xml_get_sync = xml_get_sync;
		document.addEventListener('wheel', onWheel, { passive: false});

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
		<div bind:this={canvasContainer} class="h-full w-full overflow-y-auto overflow-x-auto grid gap-20 p-16">
			<!-- <div>
				{#each pages as page}
					<div>{@html page}</div>
				{/each}
			</div> -->
		</div>
	</Resizable.Pane>
</Resizable.PaneGroup>
