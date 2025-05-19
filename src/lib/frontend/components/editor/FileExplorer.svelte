<script lang="ts">
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";
	import { FilePlus, FolderPlus, Upload } from "lucide-svelte";
	import { hoverQueueActionBuilder } from "../../actions/HoverQueue.svelte";
	import { getHoverQueue, setHoverQueue } from "../../stores/HoverQueue.svelte";
	import { getDragStore, setDragStore } from "../../stores/DragStore.svelte";
	import { dragOverActionBuilder } from "../../actions/Drag.svelte";
	import { contextMenuAction } from "../../actions/ContextMenu.svelte";
	import Entry from "./Entry.svelte";
	import { setContextMenuStore } from "../../stores/ContextMenu.svelte";
	import { portalAction } from "../../actions/Portal.svelte";
	import FileExplorerContextMenu from "./FileExplorerContextMenu.svelte";
	import type { TreeNode } from "@/lib/backend/stores/vfs/TreeNode.svelte";


    const vfs = getVirtualFileSystem();
    
    const hoverQueue = setHoverQueue<TreeNode>();
    const hoverQueueAction = hoverQueueActionBuilder<TreeNode>();
    
    const dragStore = setDragStore<TreeNode>();
    const dragOverAction = dragOverActionBuilder<TreeNode>();

    const ctxMenuStore = setContextMenuStore();

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

<div use:portalAction={{}}>
    <FileExplorerContextMenu />
</div>
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
        ctxMenuStore.show = false;
        ctxMenuStore.position = e.detail;
        setTimeout(() => {
            ctxMenuStore.show = true;
        }, 0);
    }}
    onhidemenu={() => (ctxMenuStore.show = false)}
    use:dragOverAction={{ dragStore, item: vfs.getTree() }}
    ondragover={() => console.log('dragover root')}
    class={[
        dragStore.getDragOverItem() === vfs.getTree() &&
        dragStore.isDragging() &&
        dragStore.getDragOverItem() !== dragStore.getDragItem()?.parent
            ? 'bg-base-100/75'
            : '',
        'menu menu-md border-base-100 h-full w-full border-t'
    ]}
>
    {#each vfs.getTree().getChildren() as child (child.file.id)}
        <Entry entry={child} />
    {/each}
</ul>