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

export interface Grammar {
	name?: string;
	scopeName?: string;
  	patterns?: Pattern[];
  	repository?: Repository;
}
export type Repository = Record<string, Pattern>;
type MaybeRegExp = RegExp | string;

export type PatternCommon = Pick<PatternAny, "comment" | "disabled" | "name">;
export type PatternInclude = PatternCommon &
  Pick<PatternAny, "include" | "patterns">;
export type PatternMatch = PatternCommon &
  Pick<PatternAny, "match" | "captures">;
export type PatternBeginEnd = PatternCommon &
  Pick<
    PatternAny,
    | "begin"
    | "end"
    | "contentName"
    | "beginCaptures"
    | "endCaptures"
    | "applyEndPatternLast"
    | "patterns"
  >;
export type PatternBeginWhile = PatternCommon &
  Pick<
    PatternAny,
    | "begin"
    | "while"
    | "contentName"
    | "beginCaptures"
    | "whileCaptures"
    | "patterns"
  >;
export type Pattern =
  | PatternInclude
  | PatternMatch
  | PatternBeginEnd
  | PatternBeginWhile;

interface PatternAny {
  /**
   * A comment.
   * @description A comment.
   * @type string
   */
  comment?: string;
  /**
   * Set this property to 1 to disable the current pattern.
   * @description Set this property to 1 to disable the current pattern.
   * @type number
   * @minimum 0
   * @maximum 1
   */
  disabled?: number;
  /**
   * This allows you to reference a different language, recursively reference the grammar itself or a rule declared in this file's repository.
   * @description This allows you to reference a different language, recursively reference the grammar itself or a rule declared in this file's repository.
   * @type string
   */
  include?: string;
  /**
   * A regular expression which is used to identify the portion of text to which the name should be assigned. Example: '\b(true|false)\b'.
   * @description A regular expression which is used to identify the portion of text to which the name should be assigned. Example: '\b(true|false)\b'.
   * @type string
   */
  match?: MaybeRegExp;
  /**
   * The name which gets assigned to the portion matched. This is used for styling and scope-specific settings and actions, which means it should generally be derived from one of the standard names.
   * @description The name which gets assigned to the portion matched. This is used for styling and scope-specific settings and actions, which means it should generally be derived from one of the standard names.
   * @type string
   */
  name?: string;
  /**
   * This key is similar to the name key but only assigns the name to the text between what is matched by the begin/end patterns.
   * @description This key is similar to the name key but only assigns the name to the text between what is matched by the begin/end patterns.
   * @type string
   */
  contentName?: string;
  /**
   * These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and end is the pattern which ends the block. Captures from the begin pattern can be referenced in the end pattern by using normal regular expression back-references. This is often used with here-docs. A begin/end rule can have nested patterns using the patterns key.
   * @description These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and end is the pattern which ends the block. Captures from the begin pattern can be referenced in the end pattern by using normal regular expression back-references. This is often used with here-docs. A begin/end rule can have nested patterns using the patterns key.
   * @type string
   */
  begin: MaybeRegExp;
  /**
   * These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and end is the pattern which ends the block. Captures from the begin pattern can be referenced in the end pattern by using normal regular expression back-references. This is often used with here-docs. A begin/end rule can have nested patterns using the patterns key.
   * @description These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and end is the pattern which ends the block. Captures from the begin pattern can be referenced in the end pattern by using normal regular expression back-references. This is often used with here-docs. A begin/end rule can have nested patterns using the patterns key.
   * @type string
   */
  end: MaybeRegExp;
  /**
   * These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and while continues it.
   * @description These keys allow matches which span several lines and must both be mutually exclusive with the match key. Each is a regular expression pattern. begin is the pattern that starts the block and while continues it.
   * @type string
   */
  while: MaybeRegExp;
  /**
   * Allows you to assign attributes to the captures of the match pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @description Allows you to assign attributes to the captures of the match pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @type Captures
   */
  captures?: Captures;
  /**
   * Allows you to assign attributes to the captures of the begin pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @description Allows you to assign attributes to the captures of the begin pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @type Captures
   */
  beginCaptures?: Captures;
  /**
   * Allows you to assign attributes to the captures of the end pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @description Allows you to assign attributes to the captures of the end pattern. Using the captures key for a begin/end rule is short-hand for giving both beginCaptures and endCaptures with same values.
   * @type Captures
   */
  endCaptures?: Captures;
  /**
   * Allows you to assign attributes to the captures of the while pattern. Using the captures key for a begin/while rule is short-hand for giving both beginCaptures and whileCaptures with same values.
   * @description Allows you to assign attributes to the captures of the while pattern. Using the captures key for a begin/while rule is short-hand for giving both beginCaptures and whileCaptures with same values.
   * @type Captures
   */
  whileCaptures?: Captures;
  /**
   * Applies to the region between the begin and end matches.
   * @description Applies to the region between the begin and end matches.
   * @type Pattern[]
   */
  patterns?: Pattern[];
  /**
   * @description
   * @type number
   * @minimum 0
   * @maximum 1
   */
  applyEndPatternLast?: number;
}

export type NumberStrings =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";

export type Captures = Partial<Record<NumberStrings, Capture>>;
export interface Capture {
  name?: string;
  patterns?: Pattern[];
}

export type MonacoBaseColors = 
	| 'editor.background'
	| 'editor.foreground'
    | 'menu.background'
	| 'editor.lineHighlightBackground'
	| 'editor.selectionBackground'
	| 'editorCursor.foreground'
