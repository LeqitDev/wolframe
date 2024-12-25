<script lang="ts">
	import { getUniLogger } from '$lib/stores/logger.svelte';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import type { Snippet } from 'svelte';

	let {
		languages,
		themes,
        editorController = $bindable({}),
        onDidChangeModelContent = $bindable(() => {}),
		status,
		children
	}: {
		languages?: App.Editor.Language[];
		themes?: App.Editor.Theme[];
        editorController?: App.Editor.Controller;
        onDidChangeModelContent?: (model: Monaco.editor.ITextModel, e: Monaco.editor.IModelContentChangedEvent) => void;
		status?: (message: string, finished: boolean) => void;
		children?: Snippet;
	} = $props();

	let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLDivElement;
	let editorEmpty = $state(true);
	const logger = getUniLogger();

    function toUri(uri: string) {
        return monaco.Uri.file(uri);
    }

    function addModel(value: string, uri: string, language?: string) {
		if (monaco.editor.getModel(toUri(uri))) {
			logger.warn('editor/svelte/addModel', 'Model already exists', { uri });
			return;
		}
        const model = monaco.editor.createModel(value, language, toUri(uri));

        model.onDidChangeContent((e) => {
            onDidChangeModelContent(model, e);
            languages?.forEach((language) => {
                if (language.onDidChangeModelContent) language.onDidChangeModelContent(model, e);
            });
        });
    }

    function removeModel(uri: string) {
        const model = monaco.editor.getModel(toUri(uri));
        model?.dispose();
    }

    function getModel(uri: string) {
        return monaco.editor.getModel(toUri(uri));
    }

    function setModel(uri: string | null) {
		editorController.activeModelPath = uri;
        if (!uri) {
            editor.setModel(null);
			editorEmpty = true;
            return;
        }
        const model = monaco.editor.getModel(toUri(uri));
        editor.setModel(model);
		editorEmpty = false;
    }

	function initExternals(monaco: typeof Monaco) {
		if (languages) {
			languages.forEach((language) => language.init(monaco));
		}
		if (themes) {
			themes.forEach((theme) => theme.init(monaco));
		}
	}

	async function postInitExternals(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) {
		if (languages) {
			languages.forEach((language) => {
				if (language.postInit) language.postInit(monaco, editor);
			});
		}
		if (themes) {
			themes.forEach((theme) => {
                if (theme.postInit) theme.postInit(monaco, editor);
            });
		}
	}

	$effect(() => {
		async function initializeMonaco() {
			status?.('Loading Monaco Editor...', false);
			monaco = (await import('$lib/monaco/monaco')).default;

			status?.('Initializing Monaco Externals...', false);
			initExternals(monaco);

			status?.('Creating Monaco Editor...', false);
			editor = monaco.editor.create(editorContainer, {
                theme: 'typst-theme',
				minimap: { enabled: false },
				fontSize: 14,
				lineNumbers: 'on',
				roundedSelection: false,
				automaticLayout: true,
				fixedOverflowWidgets: true,
				suggest: {
					showInlineDetails: true,
					showMethods: true,
					preview: true,
					previewMode: 'prefix',
				}
            });

			status?.('Post-initializing Monaco Externals...', false);
			postInitExternals(monaco, editor);

            setModel(null);

            editorController = {
                addModel,
                removeModel,
                getModel,
                setModel
            };
			status?.('Monaco Editor Initialized', true);
		}
		initializeMonaco();

		return () => {
			languages?.forEach((language) => {
				if (language.dispose) language.dispose();
			});
			themes?.forEach((theme) => {
				if (theme.dispose) theme.dispose();
			});
			monaco?.editor.getModels().forEach((model) => model.dispose());
			editor?.dispose();
			
		};
	});
</script>

<div class="flex-1 h-full max-h-[calc(100%-40px)] w-full">
	<div bind:this={editorContainer} class="h-full w-full">
		{#if editorEmpty}
			{@render children?.()}
		{/if}
	</div>
</div>
