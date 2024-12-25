import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const CoreCompletionKinds = ['Syntax', 'Func', 'Type', 'Param', 'Constant', 'Symbol'];

const CompletionItemKinds = [
	17, //Monaco.languages.CompletionItemKind.Keyword,
	1, //Monaco.languages.CompletionItemKind.Function,
	24, //Monaco.languages.CompletionItemKind.TypeParameter,
	4, //Monaco.languages.CompletionItemKind.Variable,
	8, //Monaco.languages.CompletionItemKind.Module,
	21 //Monaco.languages.CompletionItemKind.Reference
];

export interface CoreCompletionKind {
	kind: string;
	detail?: string;
}

export interface CoreCompletionItem {
	label: string;
	kind: CoreCompletionKind;
	insertText?: string;
	detail?: string;
    parsed?: string;
}

const getCompletionItemsFromCore = (
	items: App.Compiler.CompletionItemType[],
	range: Monaco.IRange
): Monaco.languages.CompletionItem[] => {
	console.log('core completions processed: ', items);

	return items.map((completion) => {
        const parsed = convertToMonacoSnippet(completion.apply);
		
		return {
			label: completion.label,
			kind: CompletionItemKinds[parseInt(completion.kind.kind)],
			insertText: parsed ?? completion.label,
			insertTextRules: parsed
				? 4 /* Monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet */
				: undefined,
			documentation: { value: completion.detail ?? '' },
			range: range
		};
	});
};

export const convertToMonacoSnippet = (template: string | undefined): string | undefined => {
	if (!template) {
		return template;
	}

	let counter = 1;

	// Replace ${...} with ${n:...}
	return template.replace(/\$\{(.*?)\}/g, (_, content) => {
		return `\${${counter++}:${content}}`;
	});
};

export class TypstCompletionProvider implements Monaco.languages.CompletionItemProvider {
	hasCompletions: boolean = false;
	completions: Monaco.languages.CompletionItem[] = [];
	currentRange: Monaco.IRange | null = null;
	requestCompletions: (file: string, offset: number) => void;
	triggerCharacters?: string[] | undefined;

	constructor(requestCompletions: (file: string, offset: number) => void) {
		this.requestCompletions = requestCompletions;
	}

	setCompletions(completions: App.Compiler.CompletionItemType[]) {
		this.completions = getCompletionItemsFromCore(
			completions,
			this.currentRange ?? { startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 }
		);
		this.hasCompletions = true;
	}

	provideCompletionItems(
		model: Monaco.editor.ITextModel,
		position: Monaco.Position,
	): Monaco.languages.ProviderResult<Monaco.languages.CompletionList> {
		const word = model.getWordUntilPosition(position);
		this.currentRange = {
			startLineNumber: position.lineNumber,
			endLineNumber: position.lineNumber,
			startColumn: word.startColumn,
			endColumn: word.endColumn
		};

		/* const textUntilPosition = model.getValueInRange({
			startLineNumber: position.lineNumber,
			startColumn: 1,
			endLineNumber: position.lineNumber,
			endColumn: position.column
		}); */

        this.requestCompletions(model.uri.path, model.getOffsetAt(position));

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.hasCompletions) {
                    clearInterval(interval);
                    resolve({
                        suggestions: this.completions
                    });
                }
            }, 100);
        });
	}

	resolveCompletionItem?(
		item: Monaco.languages.CompletionItem,
	): Monaco.languages.ProviderResult<Monaco.languages.CompletionItem> {
		return item;
	}
}