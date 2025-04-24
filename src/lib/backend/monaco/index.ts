// import monaco from "./wrapper";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
export {type Monaco};
import eventController from "../events";

class MonacoController {
    private monaco?: typeof Monaco;
    private editor?: Monaco.editor.IStandaloneCodeEditor;

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

        this.editor = this.monaco.editor.create(container, {
			theme: 'vs-dark',
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

        eventController.fire("app/monaco/editor:created");
    }

    disposeEditor() {
        if (!this.editor) return;

        this.editor.dispose();
        this.editor = undefined;
    }
}

const monacoController = new MonacoController();

export default monacoController;