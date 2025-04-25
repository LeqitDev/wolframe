import type { TreeNode } from "./lib/backend/stores/vfs/TreeNode.svelte";
import type { Monaco } from "./lib/backend/monaco";

export enum LoadingComponents {
	Compiler = 'compiler',
	Renderer = 'renderer',
	Monaco = 'monaco'
}

export enum FileType {
	Folder = 'folder',
	File = 'file'
}

type MetadataExtension<T> = Record<string, T>;

interface FileMetadata {
	id: string;
	name: string;
	parentId?: string;
	type: FileType;
	createdAt: number;
	updatedAt: number;
	metadata?: MetadataExtension<unknown>[];
}

export interface File extends FileMetadata {
	content?: string;
}

export interface IBackendFileSystem {

}

interface IMonacoExtension {
	init?: (monaco: typeof Monaco) => void;
	postInit?: (monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) => void;
}

interface IDisposable {
	dispose?: () => void;
}

/**
 * Represents a Monaco language extension that includes disposable resources
 * and an optional handler for model content changes.
 */
export interface IMonacoLanguage extends IMonacoExtension, IDisposable {
	/**
	 * Optional callback function that is triggered when the content of a Monaco
	 * editor model changes.
	 *
	 * @param model - The Monaco editor text model that has changed.
	 * @param event - The event object containing details about the content change.
	 */
	onDidChangeModelContent?: (
		model: Monaco.editor.ITextModel,
		event: Monaco.editor.IModelContentChangedEvent
	) => void;
}

export interface IMonacoTheme extends IMonacoExtension, IDisposable {}

export class FileAlreadyExistsError extends Error {
	file: TreeNode;

	constructor(fileName: string, file: TreeNode) {
		super(`File "${fileName}" already exists.`);
		this.name = 'FileAlreadyExistsError';
		this.file = file;
	}
}

export class ActionRequiredError<A, R> extends Error {
	accept: A;
	reject: R;

	constructor(accept: A, reject: R, message: string) {
		super(message);
		this.name = 'ActionRequiredError';
		this.accept = accept;
		this.reject = reject;
	}
}

export class Modal {
	title: string;
	content: string;
	cancel: () => void;
	closeOnOutsideClick: boolean;
	actions: Array<{ label: string; action: () => void; close: boolean; primary?: boolean }>;

	constructor(title: string, content: string, cancel: () => void, closeOnOutsideClick: boolean) {
		this.title = title;
		this.content = content;
		this.cancel = cancel;
		this.closeOnOutsideClick = closeOnOutsideClick;
		this.actions = [];
	}

	addAction(label: string, action: () => void, close: boolean, primary = false) {
		this.actions.push({ label, action, close, primary });
		return this;
	}

	static closeOrAccept(title: string, content: string, closeText: string, cancel: () => void, acceptText: string, acceptFn: () => void, closeOnOutsideClick = true) {
		const modal = new Modal(title, content, cancel, closeOnOutsideClick);
		modal.addAction(closeText, cancel, true, false);
		modal.addAction(acceptText, acceptFn, true, true);
		return modal;
	}
}