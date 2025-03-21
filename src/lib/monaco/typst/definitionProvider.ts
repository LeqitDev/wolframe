import { getUniLogger } from '$lib/stores/logger.svelte';
import type { HoverProvider } from '$rust/typst_flow_wasm';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export class TypstDefinitionProvider implements Monaco.languages.DefinitionProvider {
	curModel: Monaco.editor.ITextModel | null = null;
	requestDefinition: (file: string, offset: number) => void;
    retrieveModel: (uri: string) => Monaco.editor.ITextModel | null;
	logger = getUniLogger();
	range: Monaco.IRange | null = null;
    definition: Monaco.languages.Definition | null = null;
    hasDefinition: boolean = true;

    constructor(requestDefinition: (file: string, offset: number) => void, retrieveModel: (uri: string) => Monaco.editor.ITextModel | null) {
        this.requestDefinition = requestDefinition;
        this.retrieveModel = retrieveModel;
    }

    setDefinition(definition: HoverProvider) {
        console.log('monaco/typst/definitionProvider', 'Hovering over', definition);

        if (definition.definition) {
            const model = this.retrieveModel(definition.definition.name_span.file_path);
            if (!model) {
                console.error('monaco/typst/definitionProvider', 'Model not found', definition.definition.name_span.file_path);
                this.hasDefinition = true;
                return;
            }
            const start = model.getPositionAt(definition.definition.name_span.start_offset);
            const end = model.getPositionAt(definition.definition.name_span.end_offset);

            this.definition = {
                range: {
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column,
                },
                uri: model.uri,
            };

            console.log('monaco/typst/definitionProvider', 'Definition found', this.definition);
        }

        this.hasDefinition = true;
    }

	provideDefinition(
		model: Monaco.editor.ITextModel,
		position: Monaco.Position,
		token: Monaco.CancellationToken
	): Monaco.languages.ProviderResult<
		Monaco.languages.Definition | Monaco.languages.LocationLink[]
	> {
        this.curModel = model;
        this.definition = null;

        this.range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        };

        console.log('monaco/typst/definitionProvider', 'Requesting definition', model.uri.path, model.getOffsetAt(position));

        this.requestDefinition(model.uri.path, model.getOffsetAt(position));

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.hasDefinition) {
                    clearInterval(interval);
                    console.log('monaco/typst/definitionProvider', 'Definition resolved', this.definition);
                    resolve(this.definition);
                }
            }, 100);
        });
	}
}
