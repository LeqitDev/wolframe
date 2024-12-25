<script lang="ts">
	import Editor from '$lib/components/editor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { TypstLanguage, TypstTheme } from '$lib/monaco/typst';
	import { CompilerWorkerBridge } from '$lib/workerBridges';
	import CompilerWorker from '$lib/workers/compiler?worker';
	import { SuiteCore } from '$rust/typst_flow_wasm';
	import { X } from 'lucide-svelte';

	class VFSEntry implements App.FileEntry {
		path: string;
		content: string;
		open = $state(false);

		constructor(path: string, content: string) {
			this.path = path;
			this.content = content;
		}
	}

	type OpenFileEntry = VFSEntry & {
		display: {
			name: string;
			prefix: string;
		};
	};

	class VFS {
		entries: VFSEntry[] = $state([]);

		addFile(path: string, content: string) {
			this.entries.push(new VFSEntry(path, content));
		}

		openFile(path: string) {
			const entry = this.entries.find((entry) => entry.path === path);
			if (entry === undefined) return;
			entry.open = true;
		}

		get openedFiles() {
			let openFiles: OpenFileEntry[] = [];

			// 1. Collect opened entries
			const openedEntries = this.entries.filter((entry) => entry.open);

			// 2. Group by filename
			const groups = new Map<string, VFSEntry[]>();
			openedEntries.forEach((entry) => {
				const filename = entry.path.split('/').pop() || '';
				if (!groups.has(filename)) groups.set(filename, []);
				groups.get(filename)!.push(entry);
			});

			// 3. Process each group
			groups.forEach((entries, filename) => {
				if (entries.length === 1) {
					// Single file - use simple display
					openFiles.push({
						...entries[0],
						display: {
							name: filename,
							prefix: ''
						}
					});
				} else {
					// Multiple files - need prefixes
					entries.forEach((entry) => {
						const segments = entry.path.split('/');
						const name = segments.pop()!;
						let prefix = (segments.length > 1 ? '.../' : '/') + (segments.pop() || '').replace("files", '');

						openFiles.push({
							...entry,
							display: {
								name,
								prefix
							}
						});
					});
				}
			});

			return openFiles;
		}
	}

	console.clear();

	let vfs = new VFS();
	vfs.addFile('files/main.typ', '');
	vfs.addFile('files/utils/main.typ', '');

	let compiler: CompilerWorkerBridge;
	let typstLanguage = new TypstLanguage();
	let typstThemes = new TypstTheme();

	let controller = $state({}) as App.Editor.Controller;

	$effect(() => {
		compiler = new CompilerWorkerBridge(new CompilerWorker());
		typstLanguage.setCompiler(compiler);
		compiler.init('');
		compiler.onMessage((message) => {
			if (message.type === 'logger') {
				console.log(...message.message);
				return;
			}
			console.log(message);
		});
		vfs.entries.forEach((file) => {
			if (file.content === undefined) return;
			compiler.add_file(file.path, file.content);
		});
	});

	$effect(() => {
		// console.clear();
		if (controller.addModel === undefined) return;
		vfs.entries.forEach((file) => {
			if (file.content === undefined) return;
			controller.addModel!(file.content, file.path);
			vfs.openFile(file.path);
			controller.setModel!(file.path);
		});
	});
</script>

<div class="h-full flex flex-col">
	<div class="flex border-b min-h-10">
		{#each vfs.openedFiles as file}
			<Button size="sm" variant="outline" class={`text-sm rounded-none border-b-0 border-l-0 border-r h-full ${controller.activeModelPath === file.path ? 'bg-accent border-t-emerald-300 border-t-2' : ''}`} onclick={() => {
				let entry = vfs.entries.find((entry) => entry.path === file.path)!;
				if (entry.open) {
					controller.setModel!(file.path);
				}
			}}>
				{file.display.name}
				<span class="text-muted-foreground">
					{#if file.display.prefix}
						{file.display.prefix}
					{/if}
				</span>
				<button class="hover:bg-slate-600 rounded-md p-0.5" onclick={() => {
					vfs.entries.find((entry) => entry.path === file.path)!.open = false;
				}}>
					<X />
				</button>
			</Button>
		{/each}
	</div>
	<Editor languages={[typstLanguage]} themes={[typstThemes]} bind:editorController={controller} />
</div>