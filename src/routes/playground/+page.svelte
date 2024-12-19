<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { getLayoutStore } from '$lib/stores/layoutStore.svelte';
	// import { editor as meditor } from 'monaco-editor';
	import type { PageData } from './$types';
	import PageRenderWorker from '$lib/workers/page_renderer?worker';
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
	import { fade, scale, slide } from 'svelte/transition';
	import { FileQuestion, FolderOpen, LoaderCircle, PlusCircle, X } from 'lucide-svelte';
	import { TypstCompletionProvider } from '$lib/monaco';
	import { convertRemToPixels, debounce, PreviewDragger } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import { untrack } from 'svelte';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import { ServerCrash } from 'lucide-svelte';
	import { Server } from 'lucide-svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { FlowerServer } from '$lib/flower';
	import { initializePAS } from '$lib/stores/project.svelte';
	import type monaco from '$lib/monaco/editor';
	import PublishVersionDialog from '$lib/components/publish-version-dialog.svelte';

	interface RawOperation {
		range: {
			startLineNumber: number;
			startColumn: number;
			endLineNumber: number;
			endColumn: number;
		};
		text: string;
	}

	let delete_form: HTMLFormElement;

	let ctrl_down = $state(false);

	let { data }: { data: PageData } = $props();

	// Sveltekit
	const layoutStore = getLayoutStore(); // For Menu and things
	// const LOGGER = getLogger();
	// projectState.logger.logConsole(true);

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
	let isEditorEmpty = $state(true);
	// let vfs: { name: string; content: string; model: projectState.monaco.editor.ITextModel }[] = $state([]);
	let currentModelId = 0;
	let collectedEditorUpdates: any[] = []; // Editor text changes

	let openPublishDialog = $state(false);

	const projectState = initializePAS(data.project!.id, data.project_path);

	async function render() {
		compiler?.compile();
        projectState.loading = false;
	}

	const update_bouncer = debounce(() => {
		const changes = collectedEditorUpdates.flat();
		changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
        
		for (let change of changes) {
			try {
				projectState.logger.info(
					MainMonacoSection,
					'Applying change',
					change,
					projectState.getCurrentName()
				);

				// offset += change.text.length - change.rangeLength;

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
			projectState.logger.info(WorkerRendererSection, 'Removing extra pages', projectState.getPageCount() - compiled.length);
			for (let i = compiled.length; i < projectState.getPageCount(); i++) {
				projectState.logger.info(WorkerRendererSection, 'Removing page', i);
				pageRenderer?.delete(i);

				const canvas = canvasContainer.children[i] as HTMLCanvasElement;
				canvas.remove();
			}

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

	$effect(() => {
		layoutStore.setMenubarSnippet(menubar);
		projectState.logger.clearLogs();
		const completionProvider = new TypstCompletionProvider((file, offset) => {
			compiler?.completions(file, offset);
		});
		projectState.loadMessage = 'Loading WASM Flow';

		compiler = new CompilerWorkerBridge(new CompilerWorker());

		compiler.onMessage((res) => handleCompilerResponse(res, completionProvider));

		pageRenderer = new PageRendererWorkerBridge(
			new PageRenderWorker()
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
			} else {
				projectState.logger.info(WorkerRendererSection, 'Message', msg);
			}
		});

		console.log('Container', canvasContainer);

		previewDragger = new PreviewDragger(canvasContainer);

		document.addEventListener('wheel', onWheel, { passive: false });

		projectState.loadMessage = 'Loading Monaco Editor';

		import('$lib/monaco/editor')
			.then((iMonaco) => {
				projectState.monaco = iMonaco.default;
				iMonaco.initializeEditor(completionProvider).then((_editor) => {
					projectState.logger.info(MainMonacoSection, 'Editor initialized');
					editor = _editor;
					projectState.createModel = iMonaco.createModel;
					projectState.onCurrentModelChange = (model) => {
						editor.setModel(model);
						if (model) {
							isEditorEmpty = false;
						} else {
							isEditorEmpty = true;
						}
					};

					// Provide models for the vfs
					/* for (let file of data.initial_vfs) {
						let model = iMonaco.createModel(file.content);
						if (projectState.currentModel === '') {
							projectState.currentModel = file.filename;
						}
						projectState.vfs.set(file.filename, {
							content: file.content,
							model
						});
					} */
                
					editor.setModel(null);
					projectState.resetVFS();

                    projectState.addFile({
                        path: '/main.typ',
                        content: '',
                        revision: {
                            type: 'None'
                        },
                    });

setTimeout(() => {
            // add delay to prevent an echo
            projectState.vfs.get('main.typ')?.model.onDidChangeContent((e) => {
                onContentChanged(e, 'main.typ', 'main.typ');
            });
        }, 50);

                    projectState.setCurrentModel('main.typ');
							projectState.addOpenFile('main.typ', true, true);

							layoutStore.setSidebarActive(projectState.getCurrentFile()!.path);
							layoutStore.setSidebarPreview(projectState.getCurrentFile()!.path);

                    compiler.init('main.typ');
                    compiler.add_file('main.typ', '');

                    render();
							canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
							canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;

					projectState.loadMessage = 'Connecting to Typst Flower Service';

					/* flowerServer = new FlowerServer(data.project!.id, data.user.id, projectState);
					flowerServer.on_init_ok = (msg) => {
						if (msg.payload.type !== 'InitOk') return;

						// Reset state and editor
						editor.setModel(null);
						projectState.resetVFS();

						// Add the files
						msg.payload.files.forEach((file) => {
							let name = file.path.replace(data.project_path + '/', '');
							projectState.addFile(file);

							setTimeout(() => {
								// add delay to prevent an echo
								projectState.vfs.get(name)?.model.onDidChangeContent((e) => {
									onContentChanged(e, file.path, name);
								});
							}, 50);
						});

						const possibleEntryPoint = projectState.vfs.has('main.typ')
							? 'main.typ'
							: projectState.vfs.has('lib.typ')
								? 'lib.typ'
								: projectState.vfs
										.keys()
										.filter((file) => file.endsWith('.typ'))
										.next().value;

						if (possibleEntryPoint) {
							projectState.setCurrentModel(possibleEntryPoint);
							projectState.addOpenFile(possibleEntryPoint, true, true);

							layoutStore.setSidebarActive(projectState.getCurrentFile()!.path);
							layoutStore.setSidebarPreview(projectState.getCurrentFile()!.path);

							compiler.init(possibleEntryPoint);

							for (let file of msg.payload.files) {
								let name = file.path.replace(data.project_path + '/', '');
								let content = file.content;
								try {
									compiler?.add_file(name, content);
								} catch (e) {
									console.error(e);
								}
							}

							render();
							canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
							canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;
						}
					};
					flowerServer.on_open_ok = (msg) => {
						console.log('Open file ok', projectState);
						if (msg.payload.type !== 'OpenFileOk') return;

						const name = msg.payload.file.path.replace(data.project_path + '/', '');
						projectState.addFile(msg.payload.file);
						projectState.setCurrentModel(name);
						projectState.addOpenFile(name, true, false);
						layoutStore.setSidebarActive(msg.payload.file.path);
					}; */

					// Add the listeners
					/* editor.onDidChangeModelContent((e) => {
					onContentChanged(e);
				}); */
				}).catch((e) => {
					projectState.logger.error(MainMonacoSection, 'Error initializing editor', e);
				});
			})
			.catch((e) => {
				projectState.logger.error(MainMonacoSection, 'Error initializing editor', e);
			});
		// (document.getElementById('new-file-form') as HTMLFormElement).submit();

		return () => {
			// Cleanup
			projectState.resetVFS();
			editor?.dispose();
			document.removeEventListener('wheel', onWheel);
			previewDragger?.dispose();
		};
	});

	function onContentChanged(
		e: monaco.editor.IModelContentChangedEvent,
		path: string,
		name: string
	) {
		projectState.logger.info(MainMonacoSection, 'Content changed', e);
		projectState.openFiles.find((file) => file.relativePath === name)!.persisted = true;
		e.changes.sort((a, b) => b.rangeOffset - a.rangeOffset); // reads changes in reverse order
		// flowerServer.editFile(path, e.changes);
		for (let change of e.changes) {
			try {
				projectState.logger.info(
					MainMonacoSection,
					'Applying change',
					change,
					projectState.getCurrentName()
				);

				// offset += change.text.length - change.rangeLength;

				compiler?.edit(
					name,
					change.text,
					change.rangeOffset,
					change.rangeOffset + change.rangeLength
				);
			} catch (e) {
				projectState.logger.error(MainMonacoSection, 'Error applying change', e);
			}
		}
		collectedEditorUpdates = [];
		render();
		/* update_bouncer();
		let changes = e.changes.map((v: any) => {
			return {
				rangeOffset: v.rangeOffset,
				rangeLength: v.rangeLength,
				text: v.text
			};
		});
		collectedEditorUpdates.push(changes); */
	}

	$effect(() => {
		let previewRelativePath = layoutStore.sidebarPreview.replace(data.project_path + '/', '');

		compiler.print_files();
		compiler.set_root(previewRelativePath);
		render();
	});

	$effect(() => {
		layoutStore.setSidebarActions({
			onNewFile: (file) => {
				fetch(`/project/${data.project!.id}/?/newFile`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({ name: file.filename, path: file.path, content: '' })
				}).then((res) => {
					console.log(res);
				});
			},
			onFileClick: (file) => {
				const relativePath = file.path.replace(data.project_path + '/', '');
				if (projectState.currentModel === relativePath) return;
				if (projectState.vfs.has(relativePath)) {
					projectState.setCurrentModel(relativePath);
					layoutStore.setSidebarActive(file.path);
					// vfsfile.open = true;
					projectState.addOpenFile(relativePath, true, false);
					console.log('Opened file', projectState);
				} else {
					// flowerServer.openFile(file.path);
				}
			},
			onNodeMoved: (node, prev_path) => {
				const relativePath = node.path.replace(data.project_path + '/', '');
				const prev_relativePath = prev_path.replace(data.project_path + '/', '');
				projectState.moveFile(prev_relativePath, relativePath);
				compiler.move(prev_relativePath, relativePath);
				render();
			}
		});
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
</script>

{#snippet emptyEditor()}
	<div
		class="flex h-full w-full flex-col items-center justify-center"
	>
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
		<div class="flex px-2 py-1">
			{#each projectState.openFiles as file}
				{@const name = file.relativePath.split('/').pop()!}
				<Button
					variant="outline"
					size="sm"
					onclick={() => {
						if (projectState.openFiles.find((f) => f.relativePath === file.relativePath)) {
							projectState.setCurrentModel(file.relativePath);
							layoutStore.setSidebarActive(projectState.getCurrentFile()!.path);
						}
					}}
					class={`flex space-x-2 rounded-none first:rounded-tl-md last:rounded-tr-md${projectState.currentModel === file.relativePath ? ' border-b-0 border-secondary/60 hover:bg-background' : ' border-secondary/60 bg-secondary/60'}${file.persisted ? '' : ' italic'}`}
				>
					{name}
					<Button
						variant="secondary"
						size="icon"
						class="size-3"
						onclick={() => {
							const idx = projectState.openFiles.findIndex(
								(f) => f.relativePath === file.relativePath
							);
							projectState.removeOpenFile(file.relativePath);
							projectState.setCurrentModel(projectState.openFiles[idx - 1]?.relativePath ?? projectState.openFiles[idx]?.relativePath ?? '');
							layoutStore.setSidebarActive(projectState.getCurrentFile()?.path ?? '');
						}}
					>
						<X />
					</Button>
				</Button>
			{/each}
		</div>
		<div bind:this={editorAnchor} id="editor" class="h-full w-full">
			{#if isEditorEmpty}
				{@render emptyEditor()}
			{/if}
		</div>
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
