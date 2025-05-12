import type { IMonacoLanguage } from "@/app.types";
import type { Monaco } from "..";
import eventController from "../../events";
import type { TypstCoreError } from "wolframe-typst-core";
import { debug } from "../../utils";
import monacoController from "..";

export class TypstLanguage implements IMonacoLanguage {
	private disposables: Monaco.IDisposable[] = [];
	private monaco?: typeof Monaco;

	init(monaco: typeof Monaco) {
		this.monaco = monaco;
		monaco.languages.register({ id: 'typst', extensions: ['.typ'] });

		this.disposables.push(
			eventController.register('compiler/compile:error', this.onCompileError.bind(this)),
			eventController.register('renderer:render', this.onCompileSuccess.bind(this)),
		)

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

	private onCompileError(tError: TypstCoreError) {
		if (!this.monaco) {
			debug("error", "typst/language", "Monaco is not loaded yet.");
			return;
		}

		if ("CompileError" in tError) {
			for (const error of tError.CompileError) {
				eventController.fire("command/file:retrieve", error.range.path, (fileNode) => {
					const model = monacoController.getModel(fileNode.file.id, fileNode.extension!);

					if (!model) {
						debug("error", "typst/language", "Model not found for file", fileNode.file.id);
						return;
					}

					const pos = {
						start: model.getPositionAt(error.range.start),
						end: model.getPositionAt(error.range.end)
					}

					const modelRange = this.monaco!.Range.fromPositions(pos.start, pos.end);

					const marker = {
						startLineNumber: modelRange.startLineNumber,
						startColumn: modelRange.startColumn,
						endLineNumber: modelRange.endLineNumber,
						endColumn: modelRange.endColumn,
						message: error.message,
						severity: this.monaco!.MarkerSeverity.Error,
					};

					const prevMarkers = this.monaco!.editor.getModelMarkers({ resource: model.uri, owner: 'compiler' });
					this.monaco!.editor.setModelMarkers(model, 'compiler', [...prevMarkers, marker]);
				});
			}
		} else {
			debug("warning", "typst/language", "Unknown error type", tError);
			return;
		}
	}

    onDidChangeModelContent() {
		
    }

	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}