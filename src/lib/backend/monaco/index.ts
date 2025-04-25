// import monaco from "./wrapper";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
export {type Monaco};
import eventController from "../events";
import type { IMonacoLanguage, IMonacoTheme } from "@/app.types";

class MonacoController {
    private monaco?: typeof Monaco;
    private editor?: Monaco.editor.IStandaloneCodeEditor;
    private languages: Set<IMonacoLanguage> = new Set();
    private themes: Set<IMonacoTheme> = new Set();

    constructor() {}

    async initMonaco() {
        if (this.monaco) return;

        this.monaco = (await import("./wrapper")).default;
        eventController.fire("app/monaco:loaded");
    }

    // Only development
    isMonacoLoaded() {
        return !!this.monaco;
    }

    createEditor(container: HTMLElement) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        } else if (this.editor) {
            throw new Error("Editor is already created.");
        }

        console.log("Creating Monaco editor...", this.languages.size, this.themes.size);

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

        this.editor.setModel(null);

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
        this.languages.add(language);
    }

    addTheme(theme: IMonacoTheme) {
        this.themes.add(theme);
    }

    private createURI(id: string, extension: string) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        }
        return this.monaco.Uri.parse(`fileid:${id}/file.${extension}`);
    }

    createModel(id: string, extension: string, content: string, language: string | undefined) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        }

        const uri = this.createURI(id, extension);
        const model = this.monaco.editor.createModel(content, language, uri);
        return model;
    }

    setModel(model: Monaco.editor.ITextModel) {
        if (!this.editor) {
            throw new Error("Editor is not created yet.");
        }

        this.editor.setModel(model);
    }

    dispose() {
        for (const language of this.languages) {
            language.dispose?.();
        }
        this.languages.clear();
        for (const theme of this.themes) {
            theme.dispose?.();
        }
        this.themes.clear();

        this.disposeEditor();
    }
}

const monacoController = new MonacoController();

export default monacoController;