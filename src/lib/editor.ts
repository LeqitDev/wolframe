import * as monaco from 'monaco-editor';
import * as vscodeTextmate from 'vscode-textmate';
import {
	createOnigScanner,
	createOnigString,
	loadWASM,
	OnigScanner,
	OnigString
} from 'vscode-oniguruma';
import onigWasm from 'vscode-oniguruma/release/onig.wasm?url';
import typstGrammar from '$lib/assets/typst.tmLanguage.json?url';
import typstTheme from '$lib/assets/typstTokio.json';
import darkPlusTheme from '$lib/textmate/themes/dark-plus.json';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?url';
import { convertTheme, TokensProviderCache } from './textmate';
import * as typst from '../../typst-flow-wasm/pkg/typst_flow_wasm';

// Types for oniguruma
interface OnigLib {
	createOnigScanner(patterns: string[]): OnigScanner;
	createOnigString(str: string): OnigString;
}

class SimpleLanguageInfoProvider implements monaco.languages.TokensProvider {
	private grammar: vscodeTextmate.IGrammar;
	private ruleStack: vscodeTextmate.StateStack | null;

	constructor(grammar: vscodeTextmate.IGrammar) {
		this.grammar = grammar;
		this.ruleStack = null;
	}

	getInitialState(): monaco.languages.IState {
		return new (class implements monaco.languages.IState {
			clone(): monaco.languages.IState {
				return this;
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			equals(_other: monaco.languages.IState): boolean {
				return true;
			}
		})();
	}

	tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
		const lineTokens = this.grammar.tokenizeLine(line, this.ruleStack);
		console.log('lineTokens:', lineTokens); // DEBUGGING
		this.ruleStack = lineTokens.ruleStack;

		return {
			tokens: lineTokens.tokens.map((token) => ({
				startIndex: token.startIndex,
				scopes: token.scopes[token.scopes.length - 1],
				endIndex: token.endIndex
			})),
			endState: state
		};
	}
}

type MyCompletionItem = monaco.languages.CompletionItem & {
	insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
};

const typstCompletions = {
	keywords: [
		{ label: 'let', insertText: 'let ' },
		'set',
		{label: 'show', insertText: 'show '},
		{label: 'if', insertText: 'if (${1:condition}) {${2}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet},
		{label: 'else', insertText: 'else {${1}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet},
		'for',
		'in',
		'while',
		'break',
		'continue',
		'return',
		{
			label: 'import',
			insertText: 'import "${1:@preview}"${2:: }',
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
		},
		{label: 'include', insertText: 'include "${1:}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet},
		'as',
		'and',
		'or',
		'not'
	] as (string | MyCompletionItem)[],
	functions: [
		'text',
		'paragraph',
		'heading',
		'list',
		'enumerate',
		'figure',
		'table',
		'image',
		'align',
		'center',
		'left',
		'right',
		'justified',
		'bold',
		'italic',
		'underline'
	] as (string | MyCompletionItem)[],
	elements: ['page', 'columns', 'grid', 'stack', 'box', 'line', 'rect', 'circle', 'path'] as (string | MyCompletionItem)[]
};

const createCompletionItems = (
	items: (string | MyCompletionItem)[],
	kind: monaco.languages.CompletionItemKind,
	range: monaco.IRange
) => {
	return items.map((item) => {
		if (typeof item === 'string') {
			return {
				label: item,
				kind: kind,
				insertText: item,
				range: range
			};
		} else {
			return {
				...item,
				kind: kind,
				range: range
			};
		}
	});
};

/* 
	Syntax,
    Func,
    Type,
    Param,
    Constant,
    Symbol,
*/

const CoreCompletionKinds = [
	"Syntax",
    "Func",
    "Type",
    "Param",
    "Constant",
    "Symbol",
]

const CompletionItemKinds = [
	monaco.languages.CompletionItemKind.Keyword,
	monaco.languages.CompletionItemKind.Function,
	monaco.languages.CompletionItemKind.TypeParameter,
	monaco.languages.CompletionItemKind.Variable,
	monaco.languages.CompletionItemKind.Constant,
	monaco.languages.CompletionItemKind.Reference
]

interface CoreCompletionKind {
	kind: string;
	detail?: string;
}

interface CoreCompletionItem {
	label: string;
	kind: CoreCompletionKind;
	insertText?: string;
	detail?: string;
}

const getCompletionItemsFromCore = (core_completions: typst.CompletionWrapper[], range: monaco.IRange): monaco.languages.CompletionItem[] => {
	const items = core_completions.map((completion) => {
		return {
			label: completion.label(),
			kind: {
				kind: CoreCompletionKinds[completion.kind().kind],
				detail: completion.kind().detail
			} as CoreCompletionKind,
			insertText: completion.apply(),
			detail: completion.detail(),
			parsed: convertToMonacoSnippet(completion.apply())
		} as CoreCompletionItem;
	});
	console.log("core completions: ", items);

	return core_completions.map((completion) => {
		return {
			label: completion.label(),
			kind: CompletionItemKinds[completion.kind().kind],
			insertText: convertToMonacoSnippet(completion.apply()) ?? completion.label(),
			insertTextRules: completion.apply() ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
			documentation: {value: completion.detail() ?? ""},
			range: range
		};
	});
}

const convertToMonacoSnippet = (template: string | undefined): string | undefined => {
	if (!template) {
	  return template;
	}
	
	let counter = 1;
	
	// Replace ${} empty placeholders first
	// template = template.replace(/\$\{\}/g, () => `\${${counter++}}`);
	
	// Replace ${...} with ${n:...}
	return template.replace(/\$\{(.*?)\}/g, (_, content) => {
	  return `\${${counter++}:${content}}`;
	});
  }

class EditorSetup {
	private static async initOnigasm(): Promise<OnigLib> {
		const response = await fetch(onigWasm);
		const bytes = await response.arrayBuffer();
		await loadWASM(bytes);

		return {
			createOnigScanner: (patterns: string[]) => createOnigScanner(patterns),
			createOnigString: (str: string) => createOnigString(str)
		};
	}

	private static async loadGrammar(scopeName: string): Promise<string | null> {
		if (scopeName === 'source.typst') {
			const response = await fetch(
                typstGrammar
				// 'https://raw.githubusercontent.com/nvarner/typst-lsp/refs/heads/master/editors/vscode/typst.tmLanguage.json'
			);
			return response.text();
		}
		return null;
	}

	private static async createRegistry(): Promise<vscodeTextmate.Registry> {
		const onigLib = this.initOnigasm();

		return new vscodeTextmate.Registry({
			onigLib,
			loadGrammar: async (scopeName: string) => {
				const grammarContent = await this.loadGrammar(scopeName);
				if (grammarContent) {
					return vscodeTextmate.parseRawGrammar(grammarContent, typstGrammar);
				}
				return null;
			}
		});
	}

	private static loadCompletionItems(suite_core: typst.SuiteCore) {
		monaco.languages.registerCompletionItemProvider('typst', {
			provideCompletionItems: (model, position) => {
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn
				};

				const textUntilPosition = model.getValueInRange({
					startLineNumber: position.lineNumber,
					startColumn: 1,
					endLineNumber: position.lineNumber,
					endColumn: position.column
				});

				const core_completions = suite_core.autocomplete("main.typ", model.getOffsetAt(position));

				/* for(const completion of core_completions) {
					console.log("completion: ", completion.label(), " kind: ", completion.kind().kind);
				} */

				const suggestions = [
					...getCompletionItemsFromCore(core_completions, range)
					/* ...createCompletionItems(
						typstCompletions.keywords,
						monaco.languages.CompletionItemKind.Keyword,
						range
					),
					...createCompletionItems(
						typstCompletions.functions,
						monaco.languages.CompletionItemKind.Function,
						range
					),
					...createCompletionItems(
						typstCompletions.elements,
						monaco.languages.CompletionItemKind.Module,
						range
					) */
				];

				console.log("word", word);

				if (textUntilPosition.match('#import "@')) {
					suggestions.push({
						label: "package:2.0.0",
						kind: monaco.languages.CompletionItemKind.Module,
						insertText: 'package:2.0.0',
						range: range
					});
				}

				return {
					suggestions
				};
			}
		});
	}

	private static parseVscodeTheme(): monaco.editor.IStandaloneThemeData {
		const colors = typstTheme.settings[0].settings;

		const tokenColors: monaco.editor.ITokenThemeRule[] = [];

		for (let i = 1; i < typstTheme.settings.length; i++) {
			const rule = typstTheme.settings[i];
			const scope = rule.scope ?? '';
			const settings = rule.settings;

			for (const token of scope.split(',')) {
				tokenColors.push({
					token: token,
					foreground: settings.foreground,
					background: settings.background,
					fontStyle: settings.fontStyle
				});
			}
		}

		return {
			base: 'vs-dark',
			inherit: true,
			rules: tokenColors,
			colors: {
				'editor.background': colors.background!,
				'editor.foreground': colors.foreground!,
				'editor.lineHighlightBackground': colors.lineHighlight!,
				'editor.selectionBackground': colors.selection!,
				'editorCursor.foreground': colors.caret!
			}
		};
	}

	public static async setupEditor(
		container: HTMLElement,
		suite_core: typst.SuiteCore,
		options: monaco.editor.IStandaloneEditorConstructionOptions = {}
	): Promise<monaco.editor.IStandaloneCodeEditor> {
		try {
			// Create and initialize the registry
			/* const registry = await this.createRegistry();

			// Load the grammar
			const grammar = await registry.loadGrammar('source.typst');
			if (!grammar) {
				throw new Error('Failed to load Typst grammar');
			} */

			// Register the language with Monaco
			monaco.languages.register({ id: 'typst' });

			monaco.languages.setLanguageConfiguration('typst', {
				comments: {
					lineComment: '//',
					blockComment: ['/*', '*/']
				},
				brackets: [
					['{', '}'],
					['[', ']'],
					['(', ')']
				],
				autoClosingPairs: [
					{ open: '{', close: '}' },
					{ open: '[', close: ']' },
					{ open: '(', close: ')' },
					{ open: '"', close: '"', notIn: ['string'] },
					{ open: '$', close: '$', notIn: ['string'] }
				],
				autoCloseBefore: '$ \n\t',
				surroundingPairs: [
					{ open: '{', close: '}' },
					{ open: '[', close: ']' },
					{ open: '(', close: ')' },
					{ open: '"', close: '"' },
					{ open: '`', close: '`' },
					{ open: '$', close: '$' },
					{ open: '*', close: '*' },
					{ open: '_', close: '_' }
				]
			});

			// Create and register the tokens provider
			/* const tokensProvider = new SimpleLanguageInfoProvider(grammar);
			monaco.languages.setTokensProvider('typst', tokensProvider); */

			// Load the completion items
			this.loadCompletionItems(suite_core);

			monaco.editor.defineTheme('typst-theme', this.parseVscodeTheme());
			monaco.editor.defineTheme('typst-dark-theme', convertTheme(darkPlusTheme));

			// Create the editor with merged options
			const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
				...options,
				language: 'typst',
				theme: options.theme || 'vs-dark',
				automaticLayout: true,
				suggest: {
					showInlineDetails: true,
					showMethods: true,
					preview: true,
					previewMode: 'prefix',
				}
			};

			const editor = monaco.editor.create(container, editorOptions);
            const cache = new TokensProviderCache(editor);
            cache.getTokensProvider('source.typst').then((tokensProvider) => {
                monaco.languages.setTokensProvider('typst', tokensProvider);
            });
            return editor;
		} catch (error) {
			console.error('Failed to setup editor:', error);
			throw error;
		}
	}
}

// Example usage: https://github.com/ekzhang/rustpad/
async function initializeEditor(suite_core: typst.SuiteCore) {
	try {
		self.MonacoEnvironment = {
			getWorkerUrl: function (_moduleId, _label) {
				return editorWorker;
			}
		};

		const container = document.getElementById('editor');
		if (!container) {
			throw new Error('Editor container not found');
		}

		const editor = await EditorSetup.setupEditor(container, suite_core, {
			value: '// Your initial Typst content here\n\n#let typst = "hihi"',
			minimap: { enabled: false },
			fontSize: 14,
			lineNumbers: 'on',
			roundedSelection: false,
			scrollBeyondLastLine: false,
			readOnly: false,
			theme: 'typst-theme'
		});

		return editor;
	} catch (error) {
		console.error('Editor initialization failed:', error);
		throw error;
	}
}

export { initializeEditor };

export const createModel = (
	content: string,
	language: string = 'typst'
): monaco.editor.ITextModel => {
	return monaco.editor.createModel(content, language);
};

export default monaco;