<script lang="ts">
	import { getEditorManager } from "$lib/backend/stores/editor.svelte";
	import eventController from "@/lib/backend/events";
	import monacoController from "@/lib/backend/monaco";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";

    const editorManager = getEditorManager();

    const vfs = getVirtualFileSystem();

    function onMonacoLoaded() {
        console.log("Monaco loaded, adding files");
        vfs.addFile("test.txt", "Hello World!");
        vfs.addFile("test.typ", "Hello *Typst*!");

        eventController.fire("files:loaded");
    }

    function onEditorCreated() {
        console.log("Editor created, resolving loading editor");
        editorManager.resolveLoadingEditor?.();
    }

    $effect(() => {
        eventController.register("monaco:loaded", onMonacoLoaded)
        eventController.register("monaco/editor:created", onEditorCreated)

        /* if (monacoController.isEditorAlreadyCreated()) {
            console.log("Editor already created, firing event");
            eventController.fire("monaco/editor:created");
        } */
        /* setTimeout(() => {
            const folderResult = vfs.addFile("test", null);
            if (folderResult.ok) {
                vfs.addFile("test2.txt", "", folderResult.value.file.id);
                vfs.addFile("test3.txt", "", folderResult.value.file.id);
                vfs.addFile("test4.txt", "", folderResult.value.file.id);
                vfs.addFile("test5.txt", "", folderResult.value.file.id);
            }
        }, 0); */

        return () => {
            eventController.unregister("monaco:loaded", onMonacoLoaded)
            eventController.unregister("monaco/editor:created", onEditorCreated)
        }
    })
</script>