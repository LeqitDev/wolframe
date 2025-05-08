<script lang="ts">
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";
	import { portalAction } from "../../actions/Portal.svelte";
	import { getHoverQueue } from "../../stores/HoverQueue.svelte";
	import { getContextMenuStore } from "../../stores/ContextMenu.svelte";
	import type { TreeNode } from "@/lib/backend/stores/vfs/TreeNode.svelte";
	import { Check } from "lucide-svelte";
	import { getEditorManager } from "@/lib/backend/stores/editor.svelte";

    const ctxMenuStore = getContextMenuStore();

    const vfs = getVirtualFileSystem();
    const hoverQueue = getHoverQueue<TreeNode>();
	const editorManager = getEditorManager();
    
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

	function renameNode(node: TreeNode) {
		node.input = true;
		node.renaming = true;

		setTimeout(() => {
			const input = document.getElementById('newFileInput') as HTMLInputElement;
			if (input) {
				input.focus();
				input.select();
			}
		}, 0);
	}

	function setAsPreviewFile(node: TreeNode) {
		if (editorManager.previewFilePath !== node.path.rooted()) {
			editorManager.setPreviewFilePath(node.path.rooted());
		}
	}
</script>

{#snippet menuentry(ticked: boolean, label: string, action: () => void)}
	<li class={["mx-1 first:mt-2 last:mb-2"]}>
		<button
			class={["flex items-center gap-2 py-1.5", ticked ? '' : 'pl-6']}
			onclick={action}
		>
			{#if ticked}
				<Check class="h-4 w-4" />
			{/if}
			{label}
		</button>
	</li>
{/snippet}

{#if ctxMenuStore.show}
	{@const item = hoverQueue.item}
	<ul
		class="bg-base-300 rounded-box menu menu-sm absolute z-10 w-full max-w-60 p-0 shadow-lg"
		style="top: {ctxMenuStore.position.y}px; left: {ctxMenuStore.position.x}px;"
		use:portalAction={{}}
	>
		{#if item?.isFile}
			{@render menuentry(editorManager.previewFilePath == item!.path.rooted(), "Preview File", () => setAsPreviewFile(item!))}
		{:else}
			{@render menuentry(false, "New File", () => addNewFile(item!))}
			{@render menuentry(false, "New Folder", () => addNewFile(item!, true))}
		{/if}
		{#if item && item.file.id !== 'root'}
			<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
			{@render menuentry(false, `Delete ${item?.isFile ? 'File' : 'Folder'}`, () => vfs.removeFile(item!.file.id))}
			<div class="divider m-0 before:h-[1px] after:h-[1px]"></div>
			{@render menuentry(false, `Rename ${item?.isFile ? 'File' : 'Folder'}`, () => renameNode(item!))}
		{/if}
	</ul>
{/if}