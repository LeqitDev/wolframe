<script lang="ts">
	import { getEditorManager } from "$lib/backend/stores/editor.svelte";
	import eventController from "@/lib/backend/events";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";

    const editorManager = getEditorManager();

    const vfs = getVirtualFileSystem();

    $effect(() => {
        editorManager.resolveLoadingEditor?.();

        eventController.register("app/monaco:loaded", () => {
            vfs.addFile("test.txt", "Hello World!");
            vfs.addFile("test.typ", "Hello *Typst*!");
        })
        /* setTimeout(() => {
            const folderResult = vfs.addFile("test", null);
            if (folderResult.ok) {
                vfs.addFile("test2.txt", "", folderResult.value.file.id);
                vfs.addFile("test3.txt", "", folderResult.value.file.id);
                vfs.addFile("test4.txt", "", folderResult.value.file.id);
                vfs.addFile("test5.txt", "", folderResult.value.file.id);
            }
        }, 0); */
    })
</script>