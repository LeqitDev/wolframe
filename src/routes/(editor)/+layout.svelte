<script lang="ts">
	import { setEditorManager } from '$lib/backend/stores/editor.svelte';
	import { setVirtualFileSystem } from '@/lib/backend/stores/vfs.svelte';
	import DropdownMenuItem from '@/lib/frontend/components/DropdownMenuItem.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import FileExplorer from '@/lib/frontend/components/editor/FileExplorer.svelte';
	import eventController from '@/lib/backend/events';
	import monacoController from '@/lib/backend/monaco';
	import { TypstTheme } from '@/lib/backend/monaco/typst/theme';
	import { TypstLanguage } from '@/lib/backend/monaco/typst/language';
	import MonacoEditor from '@/lib/frontend/components/editor/MonacoEditor.svelte';
	import { portalAction } from '@/lib/frontend/actions/Portal.svelte';

	let { children } = $props();

	const editorManager = setEditorManager();
	const vfs = setVirtualFileSystem();
	const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
	let showConsole = $state(15);

	$effect(() => {
		return () => {
			editorManager.dispose();
		}
	});
</script>

{#await awaitLoad}
	<div class="bg-base-100 absolute top-0 left-0 flex h-screen w-screen items-center justify-center" use:portalAction={{}}>
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
			<ul class="menu menu-horizontal bg-base-200 w-full gap-2 pb-3">
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
						<Pane class="bg-base-200">
							<p>Preview</p>
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
