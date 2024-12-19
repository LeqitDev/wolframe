<script lang="ts">
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

	let {
		languages,
		themes,
        editorController = $bindable({}),
        onDidChangeModelContent = $bindable(() => {})
	}: {
		languages?: App.Editor.Language[];
		themes?: App.Editor.Theme[];
        editorController?: App.Editor.Controller;
        onDidChangeModelContent?: (model: Monaco.editor.ITextModel, e: Monaco.editor.IModelContentChangedEvent) => void;
	} = $props();

	let editor: Monaco.editor.IStandaloneCodeEditor;
	let monaco: typeof Monaco;
	let editorContainer: HTMLDivElement;

    function toUri(uri: string) {
        return monaco.Uri.parse('wolframe:' + uri);
    }

    function addModel(value: string, uri: string, language?: string) {
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
        if (!uri) {
            editor.setModel(null);
            return;
        }
        const model = monaco.editor.getModel(toUri(uri));
        editor.setModel(model);
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
			monaco = (await import('$lib/monaco/monaco')).default;

			initExternals(monaco);

			editor = monaco.editor.create(editorContainer, {
                theme: 'typst-theme'
            });

			postInitExternals(monaco, editor);

			addModel('Hello World', '/main.typ', 'typst');
            setModel('/main.typ');

            editorController = {
                addModel,
                removeModel,
                getModel,
                setModel
            };
		}
		initializeMonaco();

		return () => {
			monaco?.editor.getModels().forEach((model) => model.dispose());
			editor?.dispose();
		};
	});
</script>

<div class="h-full w-full">
	<div bind:this={editorContainer} class="h-full w-full"></div>
</div>
