import type { IMonacoTheme } from '@/app.types';
import type { Monaco } from '..';
import typstTheme from '$lib/assets/monaco/themes/typst/tokyo-night.json';

export class TypstTheme implements IMonacoTheme {
	private disposables: Monaco.IDisposable[] = [];

	init(monaco: typeof Monaco) {
		monaco.editor.defineTheme('typst-dark', this.parseVscodeTheme());
	}

	async postInit(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) {
		const TokensProviderCache = (await import('../textmate')).TokensProviderCache;
		const cache = new TokensProviderCache(editor);
		cache.getTokensProvider('source.typst').then((tokensProvider) => {
			const disposer = monaco.languages.setTokensProvider('typst', tokensProvider);
			this.disposables.push(disposer);
		});
	}

	/**
	 * Parses a VS Code theme and converts it into a Monaco Editor standalone theme data object.
	 *
	 * This method processes the `typstTheme` object to extract color and token style information
	 * and maps it to the Monaco Editor theme format. It supports token customization, background,
	 * foreground, and other editor-specific styles.
	 *
	 * @returns {Monaco.editor.IStandaloneThemeData} The Monaco Editor theme data object.
	 *
	 * @remarks
	 * - The `typstTheme` object is expected to follow the VS Code theme format, where `settings`
	 *   contains an array of rules for token styling and editor colors.
	 * - The first element in `typstTheme.settings` is used to extract general editor colors.
	 * - Subsequent elements in `typstTheme.settings` define token-specific styles, which are
	 *   converted into Monaco Editor token theme rules.
	 */
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
            /* 
                See playground at https://microsoft.github.io/monaco-editor/playground.html?source=v0.52.2#XQAAAAJVAQAAAAAAAABBqQkHQ5NjdMjwa-jY7SIQ9S7DNlzs5W-mwj0fe1ZCDRFc9ws9XQE0SJE1jc2VKxhaLFIw9vEWSxW3yscwzUw3RgmSa7SUctt0--dGQiknyaYMY3xr3kkxlp8ly-wqeHd4i0HDRY_mBSxDwlBu7VVI9Eu_Z6Cy6jJZ8VqFKdOxNvV_13Xjlk0uJ2xW4GcXd7KyxugZECBrE2HOERUquDGqgvnUh3SNmE4UVO4ZiSfMmMayJm42pXl6mk719B9_Y8N3CA5ObeYljauoEnMzjkQIxkGd392BwjpXxj-zVw4hivC9A4t66Df-6sUrfoOVdqe6KgkAWMOgyyWRhkdhdylBBCJQN5bqZdOWO8ZKu4hVJ6f_0Ri2AA

                wich code:
                ```
                const colors = _amdLoaderGlobal.require('vs/platform/registry/common/platform').Registry.data.get('base.contributions.colors').colorSchema.properties;
                monaco.editor.create(document.getElementById("container"), {
                    value: JSON.stringify(colors, null, 2),
                    language: "json"
                });
                ```
            */
			colors: {
				'editor.background': colors.background!,
				'editor.foreground': colors.foreground!,
                'menu.background': colors.background!,
				'editor.lineHighlightBackground': colors.lineHighlight!,
				'editor.selectionBackground': colors.selection!,
				'editorCursor.foreground': colors.caret!
			}
		};
	}

	dispose() {
		this.disposables.forEach((d) => d.dispose());
		this.disposables = [];
	}
}
