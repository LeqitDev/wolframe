import type { IMonacoLanguage } from "@/app.types";
import type { Monaco } from "..";

export class TypstLanguage implements IMonacoLanguage {
	private disposables: Monaco.IDisposable[] = [];
	private monaco?: typeof Monaco;

	init(monaco: typeof Monaco) {
		this.monaco = monaco;
		monaco.languages.register({ id: 'typst', extensions: ['.typ'] });

		const disposer = monaco.languages.setLanguageConfiguration('typst', {
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
	}

	postInit() {
		
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

    onDidChangeModelContent() {
		
    }

	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}