import { getUniLogger } from '$lib/stores/logger.svelte';
import type { JsDefinition } from '$rust/typst_flow_wasm';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export class TypstHoverProvider implements Monaco.languages.HoverProvider {
    hasHover = true;
    hover: Monaco.languages.Hover | null = null;
    curModel: Monaco.editor.ITextModel | null = null;
    requestDefinition: (file: string, offset: number) => void;
    logger = getUniLogger();

    constructor(requestDefinition: (file: string, offset: number) => void) {
        this.requestDefinition = requestDefinition;
    }

    setHover(definition: App.Definition) {

        this.logger.info('monaco/typst/hoverProvider', 'Hovering over', definition);

        if (!this.curModel) return;

        const start = this.curModel.getPositionAt(definition.name_span.range[0]);
        const end = this.curModel.getPositionAt(definition.name_span.range[1]);

        this.hover = {
            range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column
            },
            contents: [
                { value: definition.name ?? '' }
            ]
        };
        this.hasHover = true;
    }

    provideHover(model: Monaco.editor.ITextModel, position: Monaco.Position, token: Monaco.CancellationToken, context?: Monaco.languages.HoverContext<Monaco.languages.Hover> | undefined): Monaco.languages.ProviderResult<Monaco.languages.Hover> {
        this.curModel = model;

        console.log('Hovering over', model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column + 1
        }));

        this.requestDefinition(model.uri.path, model.getOffsetAt(position));

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.hasHover) {
                    clearInterval(interval);
                    resolve(this.hover);
                }
            }, 100);
        });
    }
}