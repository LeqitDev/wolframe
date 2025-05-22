import * as vsctm from 'vscode-textmate';
import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma';
import { type Monaco } from '..';
import wasmURL from 'vscode-oniguruma/release/onig.wasm?url';
import { type IColorTheme, TMToMonacoToken } from './tm-to-monaco-token';

/* Credits: https://github.com/caleb1248/monaco-vscode-textmate */

export { convertTheme, type IVScodeTheme, type TokenColor } from './theme-converter';

const wasmPromise = fetch(wasmURL)
	.then((response) => response.arrayBuffer())
	.then((buffer) => loadWASM({ data: buffer }))
	.catch((error) => console.error('Failed to load `onig.wasm`:', error));

const scopeUrlMap: Record<string, string> = {
	'source.typst':
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
				const parsed_grammar = JSON.parse(grammar);
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
						comment: 'Module function arguments',
						begin: '(?<=#(?:[[:alpha:]_][[:alnum:]_-]*\\.)*([[:alpha:]_][[:alnum:]_-]*)!?)\\(',
						end: '\\)',
						captures: {
							'0': {
								name: 'punctuation.definition.group.typst'
							}
						},
						patterns: [
							{
								include: '#arguments'
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
	editor?: (Monaco.editor.IStandaloneCodeEditor & { _themeService?: any }) | undefined
): Promise<Monaco.languages.TokensProvider> {
	let colorTheme: IColorTheme | undefined = undefined;

	if (editor) {
		const rules: Monaco.editor.ITokenThemeRule[] = editor._themeService._theme.themeData.rules;
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
			const rules: Monaco.editor.ITokenThemeRule[] = theme.themeData.rules;
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

	const result: Monaco.languages.TokensProvider = {
		getInitialState() {
			return vsctm.INITIAL;
		},
		tokenize(line, state: vsctm.StateStack) {
			const lineTokens = grammar.tokenizeLine(line, state);
			const tokens: Monaco.languages.IToken[] = [];
			for (const token of lineTokens.tokens) {
				const scopes = colorTheme ? TMToMonacoToken(colorTheme, token.scopes)
						: token.scopes[token.scopes.length - 1];
				tokens.push({
					startIndex: token.startIndex,
					// Monaco doesn't support an array of scopes
					scopes
				});
				//console.log('token', token, scopes, TMToMonacoToken(colorTheme!, token.scopes));
			}
			return { tokens, endState: lineTokens.ruleStack };
		}
	};

	return result;
}

class TokensProviderCache {
	private cache: Record<string, Monaco.languages.TokensProvider> = {};

	constructor(private editor?: Monaco.editor.IStandaloneCodeEditor | undefined) {}

	async getTokensProvider(scopeName: string): Promise<Monaco.languages.TokensProvider> {
		if (!this.cache[scopeName]) {
			this.cache[scopeName] = await createTokensProvider(scopeName, this.editor);
		}

		return this.cache[scopeName];
	}
}

export { TokensProviderCache };
