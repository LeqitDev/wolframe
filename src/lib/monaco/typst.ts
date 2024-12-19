import type * as Monaco from 'monaco-editor';
import typstTheme from '$lib/assets/typstTokio.json';

export class TypstLanguage implements App.Editor.Language {
	init(monaco: typeof Monaco) {
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
	}

    onDidChangeModelContent(model: Monaco.editor.ITextModel, e: Monaco.editor.IModelContentChangedEvent) {
        console.log('Model content changed', model.uri, e);
    }
}

export class TypstTheme implements App.Editor.Theme {
    init(monaco: typeof Monaco) {
        monaco.editor.defineTheme('typst-theme', this.parseVscodeTheme());
    }

    async postInit(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) {
        const TokensProviderCache = (await import('$lib/textmate')).TokensProviderCache;
        const cache = new TokensProviderCache(editor);
        cache.getTokensProvider('source.typst').then((tokensProvider) => {
            monaco.languages.setTokensProvider('typst', tokensProvider);
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
}
