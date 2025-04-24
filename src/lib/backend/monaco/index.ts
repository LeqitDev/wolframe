// import monaco from "./wrapper";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
export {type Monaco};
import eventController from "../events";
import type { IMonacoLanguage, IMonacoTheme } from "@/app.types";

class MonacoController {
    private monaco?: typeof Monaco;
    private editor?: Monaco.editor.IStandaloneCodeEditor;
    private languages: IMonacoLanguage[] = [];
    private themes: IMonacoTheme[] = [];

    constructor() {}

    async initMonaco() {
        if (this.monaco) return;

        this.monaco = (await import("./wrapper")).default;
        eventController.fire("app/monaco:loaded");
    }

    createEditor(container: HTMLElement) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        } else if (this.editor) {
            throw new Error("Editor is already created.");
        }

        console.log("Creating Monaco editor...", this.languages.length, this.themes.length);

        for (const language of this.languages) {
            language.init?.(this.monaco);
        }

        for (const theme of this.themes) {
            theme.init?.(this.monaco);
        }

        this.editor = this.monaco.editor.create(container, {
			theme: 'typst-dark',
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
				previewMode: 'prefix'
			}
		});

        // Testing
        this.editor.setModel(
            this.monaco.editor.createModel(
                "Hello World\nThis is $3/4$ a test\n",
                "typst"
            )
        );

        for (const language of this.languages) {
            language.postInit?.(this.monaco, this.editor);
        }

        for (const theme of this.themes) {
            theme.postInit?.(this.monaco, this.editor);
        }

        eventController.fire("app/monaco/editor:created");
    }

    disposeEditor() {
        if (!this.editor) return;

        this.editor.dispose();
        this.editor = undefined;
    }

    addLanguage(language: IMonacoLanguage) {
        this.languages.push(language);
    }

    addTheme(theme: IMonacoTheme) {
        this.themes.push(theme);
    }

    dispose() {
        for (const language of this.languages) {
            language.dispose?.();
        }
        this.languages = [];
        for (const theme of this.themes) {
            theme.dispose?.();
        }
        this.themes = [];

        this.disposeEditor();
    }
}

const monacoController = new MonacoController();

export default monacoController;