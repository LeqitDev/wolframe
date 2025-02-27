import * as vsctm from 'vscode-textmate';
import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma';
import * as monaco from 'monaco-editor';
import wasmURL from 'vscode-oniguruma/release/onig.wasm?url';
import { type IColorTheme, TMToMonacoToken } from './tm-to-monaco-token';
import tinymistLang from '../assets/typst.tinymist.tmLanguage.json?url';

function deepMerge(target: any, source: any) {
	for (const key in source) {
		if (source.hasOwnProperty(key)) {
			if (source[key] instanceof Object && !Array.isArray(source[key])) {
				// If the source property is an object, recursively merge
				target[key] = target[key] || {};
				deepMerge(target[key], source[key]);
			} else {
				// For arrays and primitive values, directly assign
				target[key] = source[key];
			}
		}
	}
	return target;
}

/* 
  Credits: https://github.com/caleb1248/monaco-vscode-textmate
*/

export { convertTheme, type IVScodeTheme, type TokenColor } from './theme-converter';

const wasmPromise = fetch(wasmURL)
	.then((response) => response.arrayBuffer())
	.then((buffer) => loadWASM({ data: buffer }))
	.catch((error) => console.error('Failed to load `onig.wasm`:', error));

const scopeUrlMap: Record<string, string> = {
	'source.typst':
		//tinymistLang	
	//'https://github.com/michidk/typst-grammar/blob/main/grammars/typst.tmLanguage.json'
		'https://raw.githubusercontent.com/nvarner/typst-lsp/refs/heads/master/editors/vscode/typst.tmLanguage.json'
};

const registry = new vsctm.Registry({
	onigLib: wasmPromise.then(() => {
		return {
			createOnigScanner: (sources) => new OnigScanner(sources),
			createOnigString: (str) => new OnigString(str)
		};
	}),
	loadGrammar(scopeName) {
		function fetchGrammar(path: string) {
			return fetch(path).then((response) => response.text());
		}

		const url = scopeUrlMap[scopeName];
		if (url) {
			return fetchGrammar(url).then((grammar) => {
				let parsed_grammar = JSON.parse(grammar);
				/* parsed_grammar = deepMerge(parsed_grammar, {
					repository: {
						markup: {
							patterns: [
								{
									comment: 'Module name',
									name: 'entity.name.module.typst',
									match: '((#)(?:[[:alpha:]_][[:alnum:]_-]*\\.)*([[:alpha:]_][[:alnum:]_-]*)!?)(?=\\[|\\()',
									captures: {
										'2': {
											name: 'punctuation.definition.function.typst'
										},
										'3': {
											name: 'entity.name.function.typst'
										}
									}
								}
							]
						}
					}
				}); */
				parsed_grammar.repository.markup.patterns = [
					...parsed_grammar.repository.markup.patterns.slice(0, 28),
					{
						comment: 'Module name',
						name: 'entity.name.module.typst',
						match:
							'((#)(?:[[:alpha:]_][[:alnum:]_-]*\\.)*([[:alpha:]_][[:alnum:]_-]*)!?)(?=\\[|\\()',
						captures: {
							'2': {
								name: 'punctuation.definition.function.typst'
							},
							'3': {
								name: 'entity.name.function.typst'
							}
						}
					},
          {
            "comment": "Module function arguments",
            "begin": "(?<=#(?:[[:alpha:]_][[:alnum:]_-]*\\.)*([[:alpha:]_][[:alnum:]_-]*)!?)\\(",
            "end": "\\)",
            "captures": {
                "0": {
                    "name": "punctuation.definition.group.typst"
                }
            },
            "patterns": [
                {
                    "include": "#arguments"
                }
            ]
          },
					...parsed_grammar.repository.markup.patterns.slice(28)
				];
				console.log(parsed_grammar);

				return parsed_grammar;
			});
		}

		return Promise.reject(new Error(`No grammar found for scope: ${scopeName}`));
	}
});

async function createTokensProvider(
	scopeName: string,
	editor?: (monaco.editor.IStandaloneCodeEditor & { _themeService?: any }) | undefined
): Promise<monaco.languages.TokensProvider> {
	let colorTheme: IColorTheme | undefined = undefined;

	if (editor) {
		const rules: monaco.editor.ITokenThemeRule[] = editor._themeService._theme.themeData.rules;
		colorTheme = {
			tokenColors: rules.map((rule) => ({
				scope: rule.token,
				settings: {
					foreground: rule.foreground,
					background: rule.background,
					fontStyle: rule.fontStyle
				}
			}))
		};

		// @ts-expect-error ...
		editor._themeService.onDidColorThemeChange((theme) => {
			const rules: monaco.editor.ITokenThemeRule[] = theme.themeData.rules;
			colorTheme = {
				tokenColors: rules.map((rule) => ({
					scope: rule.token,
					settings: {
						foreground: rule.foreground,
						background: rule.background,
						fontStyle: rule.fontStyle
					}
				}))
			};
		});
	}

	const grammar = await registry.loadGrammar(scopeName);

	if (!grammar) {
		throw new Error('Failed to load grammar');
	}

	const result: monaco.languages.TokensProvider = {
		getInitialState() {
			return vsctm.INITIAL;
		},
		tokenize(line, state: vsctm.StateStack) {
			const lineTokens = grammar.tokenizeLine(line, state);
			const tokens: monaco.languages.IToken[] = [];
			for (const token of lineTokens.tokens) {
				tokens.push({
					startIndex: token.startIndex,
					// Monaco doesn't support an array of scopes
					scopes: colorTheme
						? TMToMonacoToken(colorTheme, token.scopes)
						: token.scopes[token.scopes.length - 1]
				});
			}
			return { tokens, endState: lineTokens.ruleStack };
		}
	};

	return result;
}

class TokensProviderCache {
	private cache: Record<string, monaco.languages.TokensProvider> = {};

	constructor(private editor?: monaco.editor.IStandaloneCodeEditor | undefined) {}

	async getTokensProvider(scopeName: string): Promise<monaco.languages.TokensProvider> {
		if (!this.cache[scopeName]) {
			this.cache[scopeName] = await createTokensProvider(scopeName, this.editor);
		}

		return this.cache[scopeName];
	}
}

export { TokensProviderCache };
