<script lang="ts">
	import { getVirtualFileSystem, TreeNode } from "@/lib/backend/stores/vfs.svelte";
	import { portalAction } from "../../actions/Portal.svelte";
	import { getHoverQueue } from "../../stores/HoverQueue.svelte";

    let {
        visible = $bindable(false),
        position = $bindable({ x: 0, y: 0 }),
    }: {
        visible: boolean;
        position: { x: number, y: number };
    } = $props();

    const vfs = getVirtualFileSystem();
    const hoverQueue = getHoverQueue<TreeNode>();
    
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
</script>

{#if visible}
	{@const item = hoverQueue.item}
	<ul
		class="bg-base-300 rounded-box menu menu-sm absolute z-10 w-full max-w-60 p-0 shadow-lg"
		style="top: {position.y}px; left: {position.x}px;"
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