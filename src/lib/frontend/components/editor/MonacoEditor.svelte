<script lang="ts">
	import eventController from "@/lib/backend/events";
	import monacoController from "@/lib/backend/monaco";
	import { TypstLanguage } from "@/lib/backend/monaco/typst/language";
	import { TypstTheme } from "@/lib/backend/monaco/typst/theme";

    let editorContainer: HTMLDivElement;

    $effect(() => {
        eventController.register("app/monaco:loaded", () => {
			monacoController.createEditor(editorContainer);
		});

		const typstTheme = new TypstTheme();
		const typstLanguage = new TypstLanguage();
        
		if (monacoController.isMonacoLoaded()) {
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
			eventController.clearAll();
			monacoController.dispose();
		}
    })
</script>

<div bind:this={editorContainer} class="h-full"></div>