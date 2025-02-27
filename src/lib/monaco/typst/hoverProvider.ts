import { getUniLogger } from '$lib/stores/logger.svelte';
import type { HoverProvider } from '$rust/typst_flow_wasm';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

function parseDocs(docs: string) {
    const lines = docs.replaceAll('```example', '```typst').split('\n');
    const sections: { heading: string; content: string[] }[] = [];
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
    range: Monaco.IRange | null = null;

    constructor(requestDefinition: (file: string, offset: number) => void) {
        this.requestDefinition = requestDefinition;
    }

    setHover(definition: HoverProvider) {

        this.logger.info('monaco/typst/hoverProvider', 'Hovering over', definition);

        if (!this.curModel) return;

        const contents: Monaco.IMarkdownString[] = [];
        
        if (definition.tooltip) {
            if (definition.tooltip.code) {
                contents.push({ value: '```\n' + definition.tooltip.code + '\n```' });
            } else if (definition.tooltip.text) {
                contents.push({ value: definition.tooltip.text });
            }
        }

        if (definition.definition) {
            const start = this.curModel.getPositionAt(definition.definition.name_span.start_offset);
            const end = this.curModel.getPositionAt(definition.definition.name_span.end_offset);
            this.range = {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
            };

            contents.push({ value: `**${definition.definition.value?.name ?? definition.definition.name}** *(${(definition.definition.kind as string).toLowerCase()})*` });

            if (definition.definition.value && definition.definition.value.docs) {
                let sections = parseDocs(definition.definition.value.docs);

                contents.push({ value: '**DOCS**' });
                contents.push({ value: sections[0].content.join('\n') });

                sections = sections.slice(1);

                sections.forEach((section) => {
                    contents.push({ value: `**${section.heading}**` });
                    contents.push({ value: section.content.join('\n') });
                });
            }
        }

        this.hover = {
            range: this.range!,
            contents
        };
        this.hasHover = true;
    }

    provideHover(model: Monaco.editor.ITextModel, position: Monaco.Position, token: Monaco.CancellationToken, context?: Monaco.languages.HoverContext<Monaco.languages.Hover> | undefined): Monaco.languages.ProviderResult<Monaco.languages.Hover> {
        this.curModel = model;
        this.hover = null;

        this.range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        };

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