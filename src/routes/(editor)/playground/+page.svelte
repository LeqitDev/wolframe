<script lang="ts">
	import { getEditorManager } from "$lib/backend/stores/editor.svelte";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";

    const editorManager = getEditorManager();

    const vfs = getVirtualFileSystem();

    $effect(() => {
        editorManager.resolveLoadingEditor?.();
        setTimeout(() => {
            const folderResult = vfs.addFile("test", null);
            if (folderResult.ok) {
                vfs.addFile("test2.txt", "", folderResult.value.file.id);
                vfs.addFile("test3.txt", "", folderResult.value.file.id);
                vfs.addFile("test4.txt", "", folderResult.value.file.id);
                vfs.addFile("test5.txt", "", folderResult.value.file.id);
            }
        }, 0);
    })
</script>