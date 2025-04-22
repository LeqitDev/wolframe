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
	import { File, FilePlus, FolderClosed, FolderOpen, FolderPlus, Upload } from 'lucide-svelte';
	import { Path } from '@/lib/backend/path';
	import { untrack } from 'svelte';
	// import Modal from '@/lib/frontend/components/Modal.svelte';
	import { getModalManager } from '@/lib/frontend/stores/Modal.svelte';
	import { Modal } from '@/app.types';

	let { children } = $props();

	const modalManager = getModalManager();
	const editorManager = setEditorManager();
	const vfs = setVirtualFileSystem();
	const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
	let showConsole = $state(15);
	let detailsElement: HTMLDetailsElement;
	let modal: {
		open?: boolean;
		title?: string;
		content?: string;
		actionButtons?: Array<{ label: string; action: () => void; close: boolean; primary?: boolean }>;
		clickOutsideClose?: boolean;
	} = $state({
		open: false,
		title: '',
		content: '',
		actionButtons: [],
		clickOutsideClose: false
	});

	let contextMenuVisible = $state(false);
	let contextMenuPosition = $state({ x: 0, y: 0 });

	const hoverQueue = new HoverQueue<TreeNode>();
	const hoverQueueAction = hoverQueueActionBuilder<TreeNode>();

	const dragStore = new DragStore<TreeNode>();
	const dragAction = dragActionBuilder<TreeNode>();
	const dragOverAction = dragOverActionBuilder<TreeNode>();

	function addAllParents(item: TreeNode) {
		if (item.parent) addAllParents(item.parent);
		dragStore.addDragOverItem(item);
	}

	function addNewFile(parent: TreeNode, folder: boolean = false) {
		const result = vfs.addFile('', folder ? null : '', parent.file.id, true);
		if (result.ok) {
			if (!parent.open) {
				parent.open = true;
			}

			setTimeout(() => {
				const input = document.getElementById('newFileInput') as HTMLInputElement;
				if (input) {
					input.focus();
					input.select();
				}
			}, 0);
		}
	}

	function finalizeNewFile(el: HTMLInputElement, entry: TreeNode) {
		const name = el.value;
		if (name === '') {
			vfs.removeFile(entry.file.id);
			return;
		}
		try {
			const path = new Path(name).rootless();
			const parts = path.split('/');
			const old_entry = entry;
			entry = entry.parent!;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (i === parts.length - 1) {
					const result = vfs.addFile(part, old_entry.isFile ? '' : null, entry.file.id);
					if (result.ok) {
						const result = vfs.removeFile(old_entry.file.id);
						if (!result.ok) {
							console.error(result.error);
						}
					} else {
						old_entry.error = result.error.message;
					}
				} else {
					const result = vfs.addFile(part, null, entry.file.id);
					if (result.ok) {
						entry = result.value;
						entry.open = true;
					}
				}
			}
		} catch (e) {
			console.error(e);
			return;
		}
	}

	function finalizeRenaming(el: HTMLInputElement, entry: TreeNode) {
		const name = el.value;
		if (name === '') {
			entry.renaming = false;
			entry.input = false;
			return;
		}

		try {
			const path = new Path(name).rootless();
			const parts = path.split('/');

			if (parts.length > 1) return;

			vfs.renameFile(entry.file.id, name);
			entry.renaming = false;
			entry.input = false;
		} catch (e) {
			console.error(e);
			return;
		}
	}

	function moveFile(newParent: TreeNode, moved: TreeNode) {
		console.log('moveFile', newParent.file.name, moved.file.name);
		const result = vfs.moveFile(moved.file.id, newParent.file.id);
		console.log(result);
	}

	function onNewEntryBlurEvent(e: FocusEvent, entry: TreeNode) {
		if (entry.renaming) {
			finalizeRenaming(e.target as HTMLInputElement, entry);
		} else {
			finalizeNewFile(e.target as HTMLInputElement, entry);
		}
	}

	function onNewEntryKeydownEvent(e: KeyboardEvent, entry: TreeNode) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (entry.renaming) {
				finalizeRenaming(e.target as HTMLInputElement, entry);
			} else {
				finalizeNewFile(e.target as HTMLInputElement, entry);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if (entry.renaming) {
				entry.renaming = false;
				entry.input = false;
			} else {
				vfs.removeFile(entry.file.id);
			}
		}
	}

	function onNewEntryInputEvent(e: Event, entry: TreeNode) {
		const el = e.target as HTMLInputElement;

		if (entry.parent?.hasChild(el.value)) {
			entry.error = `File or folder with name '${el.value}' already exists at this location. Please choose a different name.`;
		} else {
			entry.error = null;
		}
	}

	$effect(() =>
		untrack(() => {
			addNewFile(vfs.getTree());
		})
	);
</script>

{#if contextMenuVisible}
	{@const item = hoverQueue.item}
	<ul
		class="bg-base-300 rounded-box menu menu-sm absolute z-10 w-full max-w-60 p-0 shadow-lg"
		style="top: {contextMenuPosition.y}px; left: {contextMenuPosition.x}px;"
		use:portalAction={{}}
	>
		{#if item?.isFile}
			<li class="mx-1 first:mt-2 last:mb-2"><button>Preview File</button></li>
		{:else}
			<li class="mx-1 first:mt-2 last:mb-2">
				<button onclick={() => addNewFile(item!)}>New File</button>
			</li>
			<li class="mx-1 first:mt-2 last:mb-2">
				<button onclick={() => addNewFile(item!, true)}>New Folder</button>
			</li>
		{/if}
		{#if item && item.file.id !== 'root'}
			<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
			<li class="mx-1 first:mt-2 last:mb-2">
				<button onclick={() => vfs.removeFile(item!.file.id)}
					>Delete {item?.isFile ? 'File' : 'Folder'}</button
				>
			</li>
			<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
			<li class="mx-1 first:mt-2 last:mb-2">
				<button
					onclick={() => {
						item!.input = true;
						item!.renaming = true;

						setTimeout(() => {
							const input = document.getElementById('newFileInput') as HTMLInputElement;
							if (input) {
								input.focus();
								input.select();
							}
						}, 0);
					}}>Rename {item?.isFile ? 'File' : 'Folder'}</button
				>
			</li>
		{/if}
	</ul>
{/if}

{#await awaitLoad}
	<p>{editorManager.loading.message}</p>
{:then}
	<div class="flex h-screen w-screen">
		<Splitpanes theme="wolframe-theme">
			<Pane size={18} snapSize={8} maxSize={70} class="bg-base-200">
				<div class="flex items-center justify-between p-2 pl-4">
					<h2 class="">File Explorer</h2>
					<div class="join">
						<button
							class="btn btn-sm btn-square btn-soft join-item"
							onclick={() => {
								addNewFile(vfs.getTree());
							}}><FilePlus class="h-4 w-4" strokeWidth="2" /></button
						>
						<button
							class="btn btn-sm btn-square btn-soft join-item"
							onclick={() => {
								addNewFile(vfs.getTree(), true);
							}}><FolderPlus class="h-4 w-4" strokeWidth="2" /></button
						>
						<button class="btn btn-sm btn-square btn-soft join-item"
							><Upload class="h-4 w-4" strokeWidth="2" /></button
						>
					</div>
				</div>
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
						dragStore.getDragOverItem() === vfs.getTree() &&
						dragStore.isDragging() &&
						dragStore.getDragOverItem() !== dragStore.getDragItem()?.parent
							? 'bg-base-100/75'
							: '',
						'menu menu-sm border-base-100 h-full w-full border-t'
					]}
				>
					{#each vfs.getTree().getChildren() as child (child.file.id)}
						{@render treenode(child)}
					{/each}
				</ul>
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

{#snippet file(entry: TreeNode)}
	{#if entry.input}
		<button class="relative">
			<File class={`h-4 w-4 ${entry.error ? 'text-error-content z-20' : ''}`} strokeWidth="2" />
			<input
				type="text"
				class={['input input-xs', entry.error ? 'z-20' : '']}
				value={entry.file.name}
				id="newFileInput"
				onblur={(e) => {
					onNewEntryBlurEvent(e, entry);
				}}
				onkeydown={(e) => {
					onNewEntryKeydownEvent(e, entry);
				}}
				oninput={(e) => {
					onNewEntryInputEvent(e, entry);
				}}
			/>
			{#if entry.error}
				<div
					class="bg-error rounded-t-box absolute top-0 right-0 bottom-0 left-0 transform p-2"
				></div>
				<div
					class="bg-error rounded-b-box absolute right-0 bottom-0 left-0 z-10 translate-y-full transform p-2"
				>
					<p class="text-error-content text-xs text-wrap">{entry.error}</p>
				</div>
			{/if}
		</button>
	{:else}
		<button
			use:dragAction={{ dragStore, item: entry }}
			ondragstart={() => {
				addAllParents(entry.parent!);
			}}
			ondragend={() => {
				const dropzone = dragStore.getDragOverItem();
				const item = dragStore.getDragItem();

				moveFile(dropzone!, item!);
			}}
		>
			<File class="h-4 w-4" strokeWidth="2" />
			{entry.file.name}
		</button>
	{/if}
{/snippet}

{#snippet folder(entry: TreeNode)}
	{#if entry.input}
		<button class="relative">
			<FolderClosed
				class={`h-4 w-4 ${entry.error ? 'text-error-content z-20' : ''}`}
				strokeWidth="2"
			/>
			<input
				type="text"
				class={['input input-xs', entry.error ? 'z-20' : '']}
				value={entry.file.name}
				id="newFileInput"
				oninput={(e) => {
					onNewEntryInputEvent(e, entry);
				}}
				onblur={(e) => {
					onNewEntryBlurEvent(e, entry);
				}}
				onkeydown={(e) => {
					onNewEntryKeydownEvent(e, entry);
				}}
			/>
			{#if entry.error}
				<div
					class="bg-error rounded-t-box absolute top-0 right-0 bottom-0 left-0 transform p-2"
				></div>
				<div
					class="bg-error rounded-b-box absolute right-0 bottom-0 left-0 z-10 translate-y-full transform p-2"
				>
					<p class="text-error-content text-xs text-wrap">{entry.error}</p>
				</div>
			{/if}
		</button>
	{:else}
		<details
			use:dragOverAction={{ dragStore, item: entry }}
			ondragovertimer={() => {
				entry.open = true;
			}}
			class={[
				dragStore.getDragOverItem() === entry &&
				dragStore.getDragOverItem() !== dragStore.getDragItem()?.parent
					? 'bg-base-100/75'
					: ''
			]}
			bind:open={entry.open}
		>
			<summary
				use:dragAction={{ dragStore, item: entry }}
				ondragstart={() => {
					addAllParents(entry.parent!);
				}}
				ondragend={() => {
					const dropzone = dragStore.getDragOverItem();
					const item = dragStore.getDragItem();

					moveFile(dropzone!, item!);
				}}
			>
				{#if entry.open}
					<FolderOpen class="h-4 w-4" strokeWidth="2" />
				{:else}
					<FolderClosed class="h-4 w-4" strokeWidth="2" />
				{/if}
				{entry.file.name}
			</summary>
			<ul>
				{#each entry.getChildren() as child (child.file.id)}
					{@render treenode(child)}
				{/each}
			</ul>
		</details>
	{/if}
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
