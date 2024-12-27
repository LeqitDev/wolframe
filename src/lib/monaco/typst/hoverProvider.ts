import { getUniLogger } from '$lib/stores/logger.svelte';
import type { Definition } from '$rust/typst_flow_wasm';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

function parseDocs(docs: string) {
    const lines = docs.replaceAll('```example', '```typst').split('\n');
    let sections: { heading: string; content: string[] }[] = [];
    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
        if (line.trim().startsWith('# ')) {
            if (currentHeading || currentContent.length) {
                sections.push({ heading: currentHeading, content: currentContent });
            }
            currentHeading = line.trim().replace(/^#\s*/, '');
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentHeading || currentContent.length) {
        sections.push({ heading: currentHeading, content: currentContent });
    }

    return sections;
}

export class TypstHoverProvider implements Monaco.languages.HoverProvider {
    hasHover = true;
    hover: Monaco.languages.Hover | null = null;
    curModel: Monaco.editor.ITextModel | null = null;
    requestDefinition: (file: string, offset: number) => void;
    logger = getUniLogger();

    constructor(requestDefinition: (file: string, offset: number) => void) {
        this.requestDefinition = requestDefinition;
    }

    setHover(definition: Definition) {

        this.logger.info('monaco/typst/hoverProvider', 'Hovering over', definition);

        if (!this.curModel) return;

        const start = this.curModel.getPositionAt(definition.name_span.start_offset);
        const end = this.curModel.getPositionAt(definition.name_span.end_offset);

        const contents: Monaco.IMarkdownString[] = [];
        contents.push({ value: `**${definition.value?.name ?? definition.name}** *(${(definition.kind as string).toLowerCase()})*` });

        if (definition.value && definition.value.docs) {
            let sections = parseDocs(definition.value.docs);

            contents.push({ value: '**DOCS**' });
            contents.push({ value: sections[0].content.join('\n') });

            sections = sections.slice(1);

            sections.forEach((section) => {
                contents.push({ value: `**${section.heading}**` });
                contents.push({ value: section.content.join('\n') });
            });
        }

        this.hover = {
            range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column
            },
            contents
        };
        this.hasHover = true;
    }

    provideHover(model: Monaco.editor.ITextModel, position: Monaco.Position, token: Monaco.CancellationToken, context?: Monaco.languages.HoverContext<Monaco.languages.Hover> | undefined): Monaco.languages.ProviderResult<Monaco.languages.Hover> {
        this.curModel = model;
        this.hover = null;

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