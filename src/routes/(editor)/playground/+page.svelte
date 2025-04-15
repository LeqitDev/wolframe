<script lang="ts">
	import { getEditorManager } from "$lib/backend/stores/editor.svelte";

    const editorManager = getEditorManager();

    $effect(() => {
        editorManager.resolveLoadingEditor?.();
        /* setTimeout(() => {
        }, 2000); */
    })
</script>