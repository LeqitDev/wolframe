<script lang="ts">
	import { getVirtualFileSystem } from '@/lib/backend/stores/vfs.svelte';
	import NewEntry from './NewEntry.svelte';
	import Entry from './Entry.svelte';
	import { FolderClosed, FolderOpen, File } from 'lucide-svelte';
	import { getDragStore } from '../../stores/DragStore.svelte';
	import { dragActionBuilder, dragOverActionBuilder } from '../../actions/Drag.svelte';
	import { getHoverQueue } from '../../stores/HoverQueue.svelte';
	import { hoverQueueActionBuilder } from '../../actions/HoverQueue.svelte';
	import { ActionRequiredError, Modal } from '@/app.types';
	import { getModalManager } from '../../stores/Modal.svelte';
	import type { TreeNode } from '@/lib/backend/stores/vfs/TreeNode.svelte';
	import monacoController from '@/lib/backend/monaco';
	import { getEditorManager } from '@/lib/backend/stores/editor.svelte';

	let {
		entry
	}: {
		entry: TreeNode;
	} = $props();

	const dragStore = getDragStore<TreeNode>();
	const dragAction = dragActionBuilder<TreeNode>();
	const dragOverAction = dragOverActionBuilder<TreeNode>();

	const hoverQueue = getHoverQueue<TreeNode>();
	const hoverQueueAction = hoverQueueActionBuilder<TreeNode>();

	const vfs = getVirtualFileSystem();
	const modalManager = getModalManager();
	const editor = getEditorManager();

	function addAllParents(item: TreeNode) {
		if (item.parent) addAllParents(item.parent);
		dragStore.addDragOverItem(item);
	}

	function moveFile(newParent: TreeNode, moved: TreeNode) {
		console.log('moveFile', newParent.file.name, moved.file.name);
		const result = vfs.moveFile(moved.file.id, newParent.file.id);
		if (!result.ok) {
			if (result.error instanceof ActionRequiredError) {
				const err = result.error as ActionRequiredError<() => void, () => void>;
				modalManager.set(Modal.closeOrAccept(
					"Conflicting file names",
					err.message,
					'Cancel',
					() => {
						err.reject();
					},
					"Overwrite",
					() => {
						err.accept();
					},
					true
				))
			}
		}
	}
</script>

<li use:hoverQueueAction={{ queue: hoverQueue, item: entry }}>
	{#if entry.input}
		<NewEntry {entry} />
	{:else if entry.isFile}
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
			onclick={() => {
				entry.openFile();
			}}
		>
			<File class="h-4 w-4" strokeWidth="2" />
			{entry.file.name}
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
					<Entry entry={child} />
				{/each}
			</ul>
		</details>
	{/if}
</li>
