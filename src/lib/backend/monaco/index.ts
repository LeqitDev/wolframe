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

    /**
     * Initializes the Monaco editor.
     * This method loads the Monaco editor asynchronously and fires an event when it's loaded.
     * @returns {Promise<void>} - A promise that resolves when Monaco is loaded.
     */
    async initMonaco() {
        if (this.monaco) return;

        this.monaco = (await import("./wrapper")).default;
        console.log("Monaco loaded");
        eventController.fire("monaco:loaded");
    }

    // Only development
    isMonacoLoaded() {
        return !!this.monaco;
    }

    // Only development
    isEditorAlreadyCreated() {
        return !!this.editor;
    }

    /**
     * Creates the Monaco editor instance.
     * This method should be called after Monaco is loaded and a container element is provided.
     * @param {HTMLElement} container - The container element for the editor.
     * @throws {Error} - Throws an error if Monaco is not loaded or the editor is already created.
     */
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

        eventController.fire("monaco/editor:created");
    }

    /**
     * Disposes the Monaco editor instance.
     * This method should be called when the editor is no longer needed.
     */
    disposeEditor() {
        if (!this.editor) return;

        this.editor.dispose();
        this.editor = undefined;
        eventController.resetOneShotEvent("monaco/editor:created");
    }

    /**
     * Adds a language to the Monaco editor.
     * @see {@link IMonacoLanguage}
     * @param {IMonacoLanguage} language - The language to add.
     */
    addLanguage(language: IMonacoLanguage) {
        this.languages.add(language);
    }

    /**
     * Adds a theme to the Monaco editor.
     * @see {@link IMonacoTheme}
     * @param {IMonacoTheme} theme - The theme to add.
     */
    addTheme(theme: IMonacoTheme) {
        this.themes.add(theme);
    }

    private createURI(id: string, extension: string) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        }
        return this.monaco.Uri.parse(`fileid:${id}/file.${extension}`);
    }

    /**
     * Creates a Monaco model.
     * @param {string} id - The ID of the model.
     * @param {string} extension - The file extension.
     * @param {string} content - The content of the model.
     * @param {string | undefined} language - The language of the model. If undefined, the language will be interpreted from the extension.
     * @returns {Monaco.editor.ITextModel} - The created model.
     */
    createModel(id: string, extension: string, content: string, language: string | undefined) {
        if (!this.monaco) {
            throw new Error("Monaco is not loaded yet.");
        }

        const uri = this.createURI(id, extension);
        const model = this.monaco.editor.createModel(content, language, uri);
        return model;
    }

    /**
     * Sets the model for the editor.
     * @param {Monaco.editor.ITextModel} model - The model to set.
     * @throws {Error} - Throws an error if the editor is not created yet.
     */
    setModel(model: Monaco.editor.ITextModel | null) {
        if (!this.editor) {
            throw new Error("Editor is not created yet.");
        }

        this.editor.setModel(model);
    }

    /**
     * Gets the URI of the current model of the editor.
     * @returns {Monaco.Uri} - The current URI of the editor's model.
     * @throws {Error} - Throws an error if the editor is not created or the model is not set yet.
     */
    getCurrentURI() {
        if (!this.editor) {
            throw new Error("Editor is not created yet.");
        }

        const model = this.editor.getModel();
        if (!model) {
            throw new Error("Model is not set yet.");
        }

        return model.uri;
    }

    /**
     * Gets the id of the file from which the model is currently open.
     * Strips the URI of the fileid: prefix and the extension placeholder.
     * @returns {string} - The ID of the current model.
     * @throws {Error} - Throws an error if the editor is not created or the model is not set yet.
     */
    getCurrentId() {
        const uri = this.getCurrentURI();

        const id = uri.toString().replace("fileid:", "").replace(/\/file\..*$/, "");
        if (!id) {
            throw new Error("Model is not set yet.");
        }
        return id;
    }

    /**
     * Disposes the Monaco controller and all its resources.
     * This method should be called when the controller is no longer needed.
     * It disposes of all languages, themes, and the editor instance.
     */
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
        this.monaco = undefined;
        eventController.resetOneShotEvent("monaco:loaded");
    }
}

const monacoController = new MonacoController();

export default monacoController;