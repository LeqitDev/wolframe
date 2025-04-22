<script lang="ts">
	import { getVirtualFileSystem, TreeNode } from "@/lib/backend/stores/vfs.svelte";
	import { FilePlus, FolderPlus, Upload } from "lucide-svelte";
	import { hoverQueueActionBuilder } from "../../actions/HoverQueue.svelte";
	import { getHoverQueue } from "../../stores/HoverQueue.svelte";
	import { getDragStore } from "../../stores/DragStore.svelte";
	import { dragOverActionBuilder } from "../../actions/Drag.svelte";
	import { contextMenuAction } from "../../actions/ContextMenu.svelte";
	import Entry from "./Entry.svelte";


    const vfs = getVirtualFileSystem();
    
    const hoverQueue = getHoverQueue<TreeNode>();
    const hoverQueueAction = hoverQueueActionBuilder<TreeNode>();
    
    const dragStore = getDragStore<TreeNode>();
    const dragOverAction = dragOverActionBuilder<TreeNode>();

    let contextMenuVisible = $state(false);
    let contextMenuPosition = $state({ x: 0, y: 0 });

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
        <Entry entry={child} />
    {/each}
</ul>