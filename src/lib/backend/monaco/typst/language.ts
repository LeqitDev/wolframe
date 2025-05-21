import type { IMonacoLanguage } from '@/app.types';
import type { Monaco } from '..';
import eventController from '../../events';
import type { TypstCoreError } from 'wolframe-typst-core';
import { debug } from '../../utils';
import monacoController from '..';
import { TypstCompletionProvider } from './provider/completionProvider';
import { loadTypstGrammar, loadVSCodeOnigurumWASM, resolveOnigLib } from '../textmate-utils';
import { loadWASM } from 'vscode-oniguruma';
import { SimpleLanguageInfoProvider } from '../textmate-utils/provider';
import typstTheme from '$lib/assets/monaco/themes/typst/tokyo-night.json';
import { registerLanguages } from '../textmate-utils/register';

export class TypstLanguage implements IMonacoLanguage {
	private disposables: Monaco.IDisposable[] = [];
	private monaco?: typeof Monaco;
	private completionProvider: TypstCompletionProvider;
	private provider?: SimpleLanguageInfoProvider;

	constructor() {
		this.completionProvider = new TypstCompletionProvider();
	}

	async init(monaco: typeof Monaco) {
		this.monaco = monaco;
		// monaco.languages.register({ id: 'typst', extensions: ['.typ'] });

		this.disposables.push(
			eventController.register('compiler/compile:error', this.onCompileError.bind(this)),
			eventController.register('renderer:render', this.onCompileSuccess.bind(this))
		);

		const data = await loadVSCodeOnigurumWASM();
		loadWASM(data);

		this.provider = new SimpleLanguageInfoProvider({
			grammars: {
				'source.typst': {
					language: 'typst'
				}
			},
			fetchGrammar: (scope) => loadTypstGrammar(),
			configurations: ['typst'],
			fetchConfiguration: async () => {
				return {
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
				};
			},
			theme: typstTheme,
			onigLib: resolveOnigLib,
			monaco
		});

		registerLanguages(
			[{ id: 'typst', extensions: ['.typ'] }],
			(language) => this.provider!.fetchLanguageInfo(language),
			monaco
		)

		/* const disposer = monaco.languages.setLanguageConfiguration('typst', {
			comments: {
				lineComment: '//',
				blockComment: ['/*', '/']
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
		}); */

		this.disposables.push(
			// disposer,
			monaco.languages.registerCompletionItemProvider('typst', this.completionProvider)
		);
	}

	postInit() {
		this.provider!.injectCSS();
	}

	private retrieveModel(uri: string) {
		if (!this.monaco) return null;

		return this.monaco.editor.getModel(this.monaco.Uri.file(uri));
	}

	private onCompileSuccess() {
		// Clear markers
		if (!this.monaco) return;

		for (const model of this.monaco.editor.getModels()) {
			this.monaco.editor.setModelMarkers(model, 'compiler', []);
		}
	}

	private onCompileError(tError: TypstCoreError) {
		if (!this.monaco) {
			debug('error', 'typst/language', 'Monaco is not loaded yet.');
			return;
		}

		if ('CompileError' in tError) {
			for (const model of this.monaco.editor.getModels()) {
				this.monaco.editor.setModelMarkers(model, 'compiler', []);
			}
			for (const error of tError.CompileError) {
				eventController.fire('command/file:retrieve', error.range.path, (fileNode) => {
					const model = monacoController.getModel(fileNode.file.id, fileNode.extension!);

					if (!model) {
						debug('error', 'typst/language', 'Model not found for file', fileNode.file.id);
						return;
					}

					const marker: Monaco.editor.IMarkerData = {
						startLineNumber: error.range.monaco_range.begin_line_number,
						startColumn: error.range.monaco_range.begin_column,
						endLineNumber: error.range.monaco_range.end_line_number,
						endColumn: error.range.monaco_range.end_column,
						message: error.message,
						severity: this.monaco!.MarkerSeverity.Error
					};

					debug('info', 'typst/language', 'Adding marker', marker, model.uri.toString(), error);

					const prevMarkers = this.monaco!.editor.getModelMarkers({
						resource: model.uri,
						owner: 'compiler'
					});
					this.monaco!.editor.setModelMarkers(model, 'compiler', [...prevMarkers, marker]);
				});
			}
		} else {
			debug('warning', 'typst/language', 'Unknown error type', tError);
			return;
		}
	}

	onDidChangeModelContent() {}

	dispose() {
		this.disposables.forEach((d) => d.dispose());
		this.disposables = [];
	}
}
