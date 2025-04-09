import { getContext, setContext, type Snippet } from 'svelte';
import { VFS } from './vfs.svelte';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { getUniLogger } from './logger.svelte';
import { FileType, type IFileSystem } from '../../app.types';
import eventController from '$lib/utils';

class Controller {
	// Sidebar
	activeFile: string = $state('');
	previewFile: string = $state('');

	setPreviewFile(file: string) {
		this.previewFile = file;
	}

	setActiveFile(file: string) {
		this.activeFile = file;
	}

	// VFS
	vfs: VFS;
	root: string = '/';

	// Layout
	menuSnippet: Snippet | null = $state(null);

	setMenuSnippet(snippet: Snippet) {
		this.menuSnippet = snippet;
	}

	// Editor
	private monaco?: typeof Monaco;
	private editor?: Monaco.editor.IStandaloneCodeEditor;
	private languages: App.Editor.Language[] = [];
	private themes: App.Editor.Theme[] = [];
    isEditorEmpty: boolean = $state(true);
    editorModelUri: string | null = $state(null);

	registerLanguage(language: App.Editor.Language) {
		this.languages.push(language);
	}

	registerTheme(theme: App.Editor.Theme) {
		this.themes.push(theme);
	}

	initExternals() {
		if (!this.monaco) return;
		this.languages.forEach((language) => language.init(this.monaco!));
		this.themes.forEach((theme) => theme.init(this.monaco!));
	}

	postInitExternals() {
		if (!this.monaco || !this.editor) return;
		this.languages.forEach((language) => language.postInit?.(this.monaco!, this.editor!));
		this.themes.forEach((theme) => theme.postInit?.(this.monaco!, this.editor!));
	}

	createEditor(view: HTMLDivElement) {
        if (!this.monaco) return;
        this.status('Creating editor');
		this.editor = this.monaco!.editor.create(view, {
			theme: 'typst-theme',
			minimap: { enabled: false },
			fontSize: 14,
			lineNumbers: 'on',
			roundedSelection: false,
			automaticLayout: true,
			fixedOverflowWidgets: true,
			suggest: {
				showInlineDetails: true,
				showMethods: true,
				preview: true,
				previewMode: 'prefix'
			}
		});
        this.status('Editor created');

        this.monaco.editor.registerEditorOpener({
            openCodeEditor: (source, resource, selectionOrPosition) => {
                console.log(source, resource, selectionOrPosition);
                if (resource.path.startsWith('/')) {
                    this.openFile(resource.path);

                    if (this.monaco?.Range.isIRange(selectionOrPosition)) {
                        this.editor?.setSelection(selectionOrPosition);
                    }

                    return true;
                }
                return false;
            },
        });

        this.postInitExternals();
        this.status('Externals post-initialized');

        this.status('Load models from VFS');
        this.vfs.entries.forEach((entry) => {
            if (entry.file.type === FileType.Directory) return;
            console.log('Adding model', entry.file.path);
            this.addModel(entry.file.content ?? "", entry.file.id);
        });
        this.status('Models loaded. Setting main file');

        const mainFile = this.vfs.getMainFile();
        if (mainFile) {
            this.openFile(mainFile.file.id);
            this.vfs.fileMutated(mainFile.file.path);
        } else {
            this.setModel(null);
        }
        eventController.fire('onEditorInitialized');
        this.status('Initialization complete', true);
	}

    monacoUri(id: string) {
        return this.monaco!.Uri.parse(`fileid:${id}`);
    }

    addModel(value: string, id: string, language: string = 'typst') {
        if (!this.monaco) return;
        const monacoUri = this.monacoUri(id);
        if (this.monaco.editor.getModel(monacoUri)) {
			this.logger.warn('editor/svelte/addModel', 'Model already exists', { uri: id });
            return;
        }
        const model = this.monaco.editor.createModel(value, language, monacoUri);

        model.onDidChangeContent((e) => {
            eventController.fire('onDidChangeModelContent', model, e);
            this.languages.forEach((language) => language.onDidChangeModelContent?.(model, e));
        });
    }

    setModel(id: string | null) {
        if (!this.monaco || !this.editor) return;
        if (id === null) {
            this.editor.setModel(null);
            this.isEditorEmpty = true;
            this.editorModelUri = null;
            return;
        }
        const monacoUri = this.monacoUri(id);
        const model = this.monaco.editor.getModel(monacoUri);
        if (!model) {
            this.logger.warn('editor/svelte/setModel', 'Model does not exist', { uri: id });
            return;
        }
        this.editor.setModel(model);
        this.isEditorEmpty = false;
        this.editorModelUri = id;
    }

    removeModel(id: string) {
        if (!this.monaco) return;
        const monacoUri = this.monacoUri(id);
        const model = this.monaco.editor.getModel(monacoUri);
        if (!model) {
            this.logger.warn('editor/svelte/removeModel', 'Model does not exist', { uri: id });
            return;
        }
        // TODO: Check if model is currently in use
        model.dispose();
    }

    private getModel(id: string) {
        if (!this.monaco) return;
        const monacoUri = this.monacoUri(id);
        return this.monaco.editor.getModel(monacoUri);
    }

    disposeEditor() {
        this.logger.info('editor/svelte/disposeEditor', 'Disposing editor');
        this.languages.forEach((language) => language.dispose?.());
        this.themes.forEach((theme) => theme.dispose?.());
        this.monaco?.editor.getModels().forEach((model) => model.dispose());
        this.editor?.dispose();
    }

	// Project
	name: string = 'Playground';
	loading = $state({
		loading: true,
		message: 'Initializing the project'
	});

    status(message: string, finished: boolean = false) {
        this.loading.message = message;
        this.loading.loading = !finished;
    }

	// General
	debug: boolean = $state(false);
    logger = getUniLogger();
    monacoOk: boolean = false;

	constructor(fs: IFileSystem) {
        this.logger.info('controller/svelte/constructor', 'Initializing controller');
		this.vfs = new VFS(fs);
	}

	init() {
		this.vfs.init().then(async () => {
            eventController.fire('onVFSInitialized');
            this.status('VFS initialized');

            this.status('Loading Monaco');
			this.monaco = (await import('$lib/monaco/monaco')).default;
            this.status('Monaco loaded');

			this.initExternals();
            this.status('Externals initialized');
            eventController.fire('onMonacoInitialized');
            this.monacoOk = true;
		});
	}

    openFile(id: string) {
        console.log('Opening file', id);
        this.vfs.openFile(id);
        this.setModel(id);
        this.setActiveFile(id);
    }

    moveFile(id: string, newPath: string) {
        this.vfs.moveFile(id, newPath);
    }

    newFile(path: string, content: string) {
        this.vfs.addFile(path, content).then((entry) => {
            this.addModel(content, entry.file.id);
        })
    }

    closeFile(id: string) {
        const last = this.vfs.closeFile(id);
        if (last) {
            this.openFile(last);
        } else {
            this.setModel(null);
            this.setActiveFile('');
        }
    }

    dispose() {
        this.logger.info('controller/svelte/dispose', 'Disposing controller');
        this.disposeEditor();
    }
}

const label = Symbol('controller');

export function initializeController(fs: IFileSystem) {
	console.log('Initializing controller');
	return setContext(label, new Controller(fs));
}

export function getController(): Controller {
	return getContext<ReturnType<typeof initializeController>>(label);
}

export type { Controller };
