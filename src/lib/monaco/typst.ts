import type * as Monaco from 'monaco-editor';
import typstTheme from '$lib/assets/typstTokio.json';
import type { CompilerWorkerBridge } from '$lib/workerBridges';
import { TypstCompletionProvider } from './completionProvider';
import { TypstHoverProvider } from './typst/hoverProvider';
import { TypstDefinitionProvider } from './typst/definitionProvider';
import eventController from '$lib/utils';

export class TypstLanguage implements App.Editor.Language {
	private compiler?: CompilerWorkerBridge;
	private completionProvider?: TypstCompletionProvider;
	private hoverProvider?: TypstHoverProvider;
	private definitionProvider?: TypstDefinitionProvider;
	private disposables: Monaco.IDisposable[] = [];
	private monaco?: typeof Monaco;

	setCompiler(compiler: CompilerWorkerBridge) {
		this.compiler = compiler;
		this.completionProvider = new TypstCompletionProvider((f, o) => this.getCompletions(f, o));
		this.hoverProvider = new TypstHoverProvider((f, o) => this.getDefinition(f, o));
		this.definitionProvider = new TypstDefinitionProvider((f, o) => this.getDefinition(f, o), (u) => this.retrieveModel(u));
		this.compiler.addObserver({
			onMessage: this.onCompilerMessage.bind(this)
		})
	}

	init(monaco: typeof Monaco) {
		this.monaco = monaco;
		monaco.languages.register({ id: 'typst', extensions: ['.typ'] });

		let disposer = monaco.languages.setLanguageConfiguration('typst', {
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

		this.disposables.push(disposer);
		
		if (this.completionProvider) {
			disposer = monaco.languages.registerCompletionItemProvider('typst', this.completionProvider);
			this.disposables.push(disposer);
		}

		if (this.hoverProvider) {
			disposer = monaco.languages.registerHoverProvider('typst', this.hoverProvider);
			this.disposables.push(disposer);
		}

		if (this.definitionProvider) {
			disposer = monaco.languages.registerDefinitionProvider('typst', this.definitionProvider);
			this.disposables.push(disposer);
		}
	}

	postInit(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) {
		editor.addAction({
			id: 'typst.ast.tree',
			label: 'Print AST',
			run: () => {
				if (!this.compiler) return;
				console.log('AST from', editor.getModel()!.uri.path);
				this.compiler.ast_tree(editor.getModel()!.uri.path);
			}
		});
	}

	private retrieveModel(uri: string) {
		if (!this.monaco) return null;

		return this.monaco.editor.getModel(this.monaco.Uri.file(uri));
	}

	private getDefinition(file: string, offset: number) {
		if (!this.compiler) return;

		this.compiler.definition(file, offset);
	}

	private getCompletions(file: string, offset: number) {
		if (!this.compiler) return;

		return this.compiler.completions(file, offset);
	}

	private onCompilerMessage(message: App.Compiler.Response) {
		switch (message.type) {
			case 'completion':
				this.onCompletionMessage(message);
				break;
			case 'error':
				this.onCompileError(message);
				break;
			case 'definition':
				this.onDefinitionMessage(message);
				break;
			case 'compile':
				this.onCompileSuccess();
				break;
		}
	}

	private onDefinitionMessage(message: App.Compiler.DefinitionResponse) {
		this.hoverProvider!.setHover(message.definition)
		this.definitionProvider!.setDefinition(message.definition);
	}

	private onCompileSuccess() {
		// Clear markers
		if (!this.monaco) return;

		for (const model of this.monaco.editor.getModels()) {
			this.monaco.editor.setModelMarkers(model, 'compiler', []);
		}
	}

	private onCompileError(message: App.Compiler.ErrorResponse) {
		if (message.sub === 'compile') {
			const markers = new Map<string, Monaco.editor.IMarkerData[]>();
			console.error('Compile error', message.errors);

			if (!this.monaco) {
				console.error('Monaco not initialized');
				return;
			}

			for (const error of message.errors) {
				const model = this.monaco.editor.getModel(this.monaco.Uri.parse(error.root.file_path));

				if (!model) {
					console.error('No model found for file', error.root.file_path);
					continue;
				}

				const pos = {
					start: model.getPositionAt(error.root.start_offset),
					end: model.getPositionAt(error.root.end_offset)
				};

				const modelRange = this.monaco.Range.fromPositions(pos.start, pos.end);

				const marker = {
					startLineNumber: modelRange.startLineNumber,
					startColumn: modelRange.startColumn,
					endLineNumber: modelRange.endLineNumber,
					endColumn: modelRange.endColumn,
					message: error.message,
					severity: this.monaco.MarkerSeverity.Error
				};

				if (!markers.has(error.root.file_path)) {
					markers.set(error.root.file_path, [marker]);
				} else {
					markers.get(error.root.file_path)!.push(marker);
				}
			}

			for (const [file, errors] of markers) {
				this.monaco.editor.setModelMarkers(this.monaco.editor.getModel(this.monaco.Uri.file(file))!, 'compiler', errors);
			}
		}
	}

	private onCompletionMessage(message: App.Compiler.CompletionResponse) {
		this.completionProvider!.setCompletions(message.completions);
	}

    onDidChangeModelContent(model: Monaco.editor.ITextModel, e: Monaco.editor.IModelContentChangedEvent) {
		eventController.fire(
			'onRetrievePath',
			model.uri.path.replace('id/', ''),
			(path) => {
				if (!this.compiler) return;

				e.changes.sort((a, b) => b.rangeOffset - a.rangeOffset);
				e.changes.forEach(change => {
					this.compiler!.edit(path, change.text, change.rangeOffset, change.rangeOffset + change.rangeLength);
				});

				this.compiler!.compile();
			}
		);
    }

	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}

export class TypstTheme implements App.Editor.Theme {
	private disposables: Monaco.IDisposable[] = [];

    init(monaco: typeof Monaco) {
        monaco.editor.defineTheme('typst-theme', this.parseVscodeTheme());
    }

    async postInit(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) {
        const TokensProviderCache = (await import('$lib/textmate')).TokensProviderCache;
        const cache = new TokensProviderCache(editor);
        cache.getTokensProvider('source.typst').then((tokensProvider) => {
            const disposer = monaco.languages.setTokensProvider('typst', tokensProvider);
			this.disposables.push(disposer);
        });
    }

    private parseVscodeTheme(): Monaco.editor.IStandaloneThemeData {
		const colors = typstTheme.settings[0].settings;

		const tokenColors: Monaco.editor.ITokenThemeRule[] = [];

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

	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}
