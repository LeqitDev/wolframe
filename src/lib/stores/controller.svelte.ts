import { getAllContexts, getContext, setContext, type Snippet } from 'svelte';
import { VFS } from './vfs.svelte';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { getUniLogger } from './logger.svelte';
import { EventController } from '$lib/utils';

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

	sidebarFileClick(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarNodeMoved(node: App.VFS.Sidebar.FileSystemNode, prev_path: string) {}
	sidebarNewFile(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarNewDir(dir: App.VFS.Sidebar.FileSystemFolder) {}
	sidebarFileDeleted(file: App.VFS.Sidebar.FileMetadata) {}
	sidebarDirDeleted(dir: App.VFS.Sidebar.FileSystemFolder) {}
	sidebarPreviewFileChange(file: App.VFS.Sidebar.FileMetadata) {}

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

	private initExternals() {
		if (!this.monaco) return;
		this.languages.forEach((language) => language.init(this.monaco!));
		this.themes.forEach((theme) => theme.init(this.monaco!));
	}

	private postInitExternals() {
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

        this.postInitExternals();
        this.status('Externals post-initialized');

        this.status('Load models from VFS');
        this.vfs.entries.forEach((entry) => {
            this.addModel(entry.content, entry.path);
        });
        this.status('Models loaded. Setting main file');

        let mainFile = this.vfs.getMainFile();
        if (mainFile) {
            this.openFile(mainFile.path);
        } else {
            this.setModel(null);
        }
        this.eventListener.fire('editorInitialized');
        this.status('Initialization complete', true);
	}

    monacoUri(uri: string) {
        return this.monaco!.Uri.parse(uri);
    }

    addModel(value: string, uri: string, language?: string) {
        if (!this.monaco) return;
        const monacoUri = this.monacoUri(uri);
        if (this.monaco.editor.getModel(monacoUri)) {
			this.logger.warn('editor/svelte/addModel', 'Model already exists', { uri });
            return;
        }
        const model = this.monaco.editor.createModel(value, language, monacoUri);

        model.onDidChangeContent((e) => {
            this.languages.forEach((language) => language.onDidChangeModelContent?.(model, e));
        });
    }

    setModel(uri: string | null) {
        if (!this.monaco || !this.editor) return;
        if (uri === null) {
            this.editor.setModel(null);
            this.isEditorEmpty = true;
            this.editorModelUri = null;
            return;
        }
        const monacoUri = this.monacoUri(uri);
        const model = this.monaco.editor.getModel(monacoUri);
        if (!model) {
            this.logger.warn('editor/svelte/setModel', 'Model does not exist', { uri });
            return;
        }
        this.editor.setModel(model);
        this.isEditorEmpty = false;
        this.editorModelUri = uri;
    }

    removeModel(uri: string) {
        if (!this.monaco) return;
        const monacoUri = this.monacoUri(uri);
        const model = this.monaco.editor.getModel(monacoUri);
        if (!model) {
            this.logger.warn('editor/svelte/removeModel', 'Model does not exist', { uri });
            return;
        }
        // TODO: Check if model is currently in use
        model.dispose();
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
    eventListener: EventController = new EventController();

	constructor(fs: App.VFS.FileSystem) {
        this.logger.info('controller/svelte/constructor', 'Initializing controller');
		this.vfs = new VFS(fs);
	}

	init() {
        this.logger.info('controller/svelte/init', 'Initializing controller');
		this.vfs.init().then(async () => {
            this.eventListener.fire('VFSInitialized');
            this.status('VFS initialized');

            this.status('Loading Monaco');
			this.monaco = (await import('$lib/monaco/monaco')).default;
            this.status('Monaco loaded');

			this.initExternals();
            this.status('Externals initialized');
            this.eventListener.fire('monacoInitialized');
		});
	}

    openFile(path: string) {
        this.vfs.openFile(path);
        this.setModel(path);
        this.setActiveFile(path);
    }

    newFile(path: string, content: string) {
        this.vfs.addFile(path, content);
        this.addModel(content, path);
    }

    closeFile(path: string) {
        let last = this.vfs.closeFile(path);
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

export function initializeController(fs: App.VFS.FileSystem) {
	console.log('Initializing controller');
	return setContext(label, new Controller(fs));
}

export function getController(): Controller {
	return getContext<ReturnType<typeof initializeController>>(label);
}

export type { Controller };