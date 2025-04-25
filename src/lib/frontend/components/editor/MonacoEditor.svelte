<script lang="ts">
	import eventController from "@/lib/backend/events";
	import monacoController from "@/lib/backend/monaco";
	import { TypstLanguage } from "@/lib/backend/monaco/typst/language";
	import { TypstTheme } from "@/lib/backend/monaco/typst/theme";
	import { getEditorManager } from "@/lib/backend/stores/editor.svelte";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";
	import type { TreeNode } from "@/lib/backend/stores/vfs/TreeNode.svelte";

    let editorContainer: HTMLDivElement;

    const vfs = getVirtualFileSystem();
    const editor = getEditorManager();

    function onMonacoLoaded() {
		monacoController.createEditor(editorContainer);
    }

    $effect(() => {
        eventController.register("app/monaco:loaded", onMonacoLoaded);

		const typstTheme = new TypstTheme();
		const typstLanguage = new TypstLanguage();
        
		if (monacoController.isMonacoLoaded()) {
            console.log("Monaco already loaded, creating editor");
			monacoController.dispose();
            monacoController.addTheme(typstTheme);
            monacoController.addLanguage(typstLanguage);
			eventController.fire("app/monaco:loaded");
		} else {
            monacoController.initMonaco();
            monacoController.addTheme(typstTheme);
            monacoController.addLanguage(typstLanguage);
        }

		return () => {
			eventController.unregister("app/monaco:loaded", onMonacoLoaded);
			monacoController.dispose();
		}
    })
</script>
<div class="h-full">
    <div role="tablist" class="tabs tabs-sm tabs-box">
        {#each vfs.getFiles().filter(file => file.isFile && file.openedFile) as file (file.file.id)}
            <button role="tab" class={["tab", editor.getOpenFileId() === file.file.id ? "tab-active" : ""]} onclick={() => {file.openFile()}}>{file.file.name}</button>
        {/each}
    </div>
    <div bind:this={editorContainer} class="h-full"></div>
</div>