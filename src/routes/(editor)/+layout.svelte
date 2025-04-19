<script lang="ts">
	import { setEditorManager } from '$lib/backend/stores/editor.svelte';
	import { setVirtualFileSystem, TreeNode } from '@/lib/backend/stores/vfs.svelte';
	import DropdownMenuItem from '@/lib/frontend/components/DropdownMenuItem.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import { contextMenuAction } from '@/lib/frontend/actions/ContextMenu.svelte';
	import { HoverQueue } from '@/lib/frontend/stores/HoverQueue.svelte';
	import { hoverQueueActionBuilder } from '@/lib/frontend/actions/HoverQueue.svelte';
	import { portalAction } from '@/lib/frontend/actions/Portal.svelte';
	import { fade } from 'svelte/transition';
	import { dragActionBuilder, dragOverActionBuilder } from '@/lib/frontend/actions/Drag.svelte';
	import { DragStore } from '@/lib/frontend/stores/DragStore.svelte';

	let { children } = $props();

	const editorManager = setEditorManager();
	const vfs = setVirtualFileSystem();
	const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
	let showConsole = $state(15);
	let detailsElement: HTMLDetailsElement;

	let contextMenuVisible = $state(false);
	let contextMenuPosition = $state({ x: 0, y: 0 });

	const hoverQueue = new HoverQueue<TreeNode>();
	const hoverQueueAction = hoverQueueActionBuilder<TreeNode>();

	const dragStore = new DragStore<TreeNode>();
	const dragAction = dragActionBuilder<TreeNode>();
	const dragOverAction = dragOverActionBuilder<TreeNode>();
</script>

{#if contextMenuVisible}
	<ul
		class="bg-base-300 rounded-box menu menu-sm absolute z-10 w-full max-w-60 p-0 shadow-lg"
		style="top: {contextMenuPosition.y}px; left: {contextMenuPosition.x}px;"
		use:portalAction={{}}
	>
		{#if hoverQueue.item?.isFile}
			<li class="mx-1 first:mt-2 last:mb-2"><button>Preview File</button></li>
		{:else}
			<li class="mx-1 first:mt-2 last:mb-2"><button>New File</button></li>
			<li class="mx-1 first:mt-2 last:mb-2"><button>New Folder</button></li>
			<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
		{/if}
		<li class="mx-1 first:mt-2 last:mb-2">
			<button>Delete {hoverQueue.item?.isFile ? 'File' : 'Folder'}</button>
		</li>
		<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
		<li class="mx-1 first:mt-2 last:mb-2">
			<button>Rename {hoverQueue.item?.isFile ? 'File' : 'Folder'}</button>
		</li>
	</ul>
{/if}

{#await awaitLoad}
	<p>{editorManager.loading.message}</p>
{:then}
	<div class="flex h-screen w-screen">
		<Splitpanes theme="wolframe-theme">
			<Pane size={18} snapSize={8} maxSize={70} class="bg-base-200">
				<h2 class="p-2 pl-4">File Explorer "{dragStore.getDragOverItem()}"</h2>
				<ul
					use:hoverQueueAction={{ queue: hoverQueue, item: vfs.getTree() }}
					use:contextMenuAction={{}}
					onshowmenu={(e) => {
						contextMenuVisible = false;
						contextMenuPosition = e.detail;
						setTimeout(() => {
							contextMenuVisible = true;
						}, 0);
					}}
					onhidemenu={() => (contextMenuVisible = false)}
					use:dragOverAction={{ dragStore, item: vfs.getTree() }}
					ondragover={() => console.log('dragover root')}
					class={[
						dragStore.getDragOverItem() === vfs.getTree() && dragStore.isDragging()
							? 'bg-base-100'
							: '',
						'menu menu-sm border-base-100 h-full w-full border-t'
					]}
				>
					{#each vfs.getTree().getChildren() as child}
						{@render treenode(child)}
					{/each}
				</ul>
			</Pane>
			<Pane class="">
				<ul class="menu menu-horizontal bg-base-100 rounded-box m-2">
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
								<p>Editor</p>
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
{:catch e}
	<p>{e}</p>
{/await}

{@render children()}

{#snippet foldericon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="h-4 w-4"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
		/>
	</svg>
{/snippet}

{#snippet fileicon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="h-4 w-4"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
		/>
	</svg>
{/snippet}

{#snippet file(entry: TreeNode)}
	<button
		use:dragAction={{ dragStore, item: entry }}
		ondragstart={() => console.log('dragstart')}
		ondragend={() => console.log('dragend')}
		ondragover={() => console.log('dragover')}
	>
		{@render fileicon()}
		{entry.file.name}
	</button>
{/snippet}

{#snippet folder(entry: TreeNode)}
	<details
		use:dragOverAction={{ dragStore, item: entry }}
		ondragovertimer={(e) => ((e.detail.element as HTMLDetailsElement).open = true)}
		class={[dragStore.getDragOverItem() === entry ? 'bg-base-100' : '']}
	>
		<summary use:dragAction={{ dragStore, item: entry }}>
			{@render foldericon()}
			{entry.file.name}
		</summary>
		<ul>
			{#each entry.getChildren() as child}
				{@render treenode(child)}
			{/each}
		</ul>
	</details>
{/snippet}

{#snippet treenode(entry: TreeNode)}
	<li use:hoverQueueAction={{ queue: hoverQueue, item: entry }}>
		{#if entry.isFile}
			{@render file(entry)}
		{:else}
			{@render folder(entry)}
		{/if}
	</li>
{/snippet}
