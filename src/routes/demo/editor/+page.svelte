<script lang="ts">
	import Editor from "$lib/components/editor.svelte";
	import { TypstLanguage, TypstTheme } from "$lib/monaco/typst";

	let typstLanguage = new TypstLanguage();
	let typstThemes = new TypstTheme();

	let controller = $state({}) as App.Editor.Controller;

	$effect(() => {
		let ok_function = controller.addModel;
		console.log(ok_function);
	})

</script>

<Editor languages={[typstLanguage]} themes={[typstThemes]} bind:editorController={controller} />
