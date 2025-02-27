// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Sections } from '$lib/stores/logger.svelte';
import type { Completion, Definition, Diagnostics, HoverProvider } from '$rust/typst_flow_wasm';
import type * as Monaco from 'monaco-editor';
import type { VFSEntry } from '$lib/stores/vfs.svelte';

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('$lib/server/auth').SessionValidationResult['user'];
			session: import('$lib/server/auth').SessionValidationResult['session'];
		}

		interface FileMetadata {
			filename: string;
			mimetype: string;
			size: number;
			lastModified: Date;
			etag: string;
			path: string;
		}

		interface UploadResult {
			path: string;
			size: number;
			etag: string;
		}

		interface IProjectMenu {
			name: string;
			actions: IMenuAction[];
		}

		interface IMenuAction {
			name: string;
			shortcut?: string;
			onclick: () => void;
		}

		interface IProjectCache {
			[key: string]: IProjectCacheMetaData;
		}

		interface IProjectCacheMetaData {
			content: null | string;
			metadata: FileMetadata;
		}

		interface FileEntry {
			path: string;
			content: string;
		}

		interface WorkerObserver {
			onMessage: (message: any) => void;
		}

		namespace VFS {
			interface FileSystem {
				init: () => Promise<void>;

				deleteFile: (path: string) => Promise<void>;
				readFile: (path: string) => Promise<string>;
				writeFile: (path: string, content: string) => Promise<void>;
				renameFile: (oldPath: string, newPath: string) => Promise<void>;

				listFiles: () => Promise<Record<string, string>>;
			}
			namespace Sidebar {

				type File = VFSEntry & {
					name: string;
					new?: boolean;
				}

				interface Folder {
					isFolder: true;
					path: string;
					depth: number;
					open: boolean;
					children: Node[];
					name: string;
					new?: boolean;
				}

				type Node = Folder | File;

				interface FileSystemFolderType {
					type: 'directory';
					depth: number;
					children: FileSystemNode[];
					open: boolean;
				}

				interface FileSystemFileType {
					type: 'file';
					size: number;
					mimetype: string;
					etag: string;
					lastModified: Date;
				}

				type FileSystemNodeType = FileSystemFileType | FileSystemFolderType;

				interface FileMetadata {
					filename: string;
					mimetype: string;
					size: number;
					lastModified: Date;
					etag: string;
					path: string;
				}

				interface BaseFileSystemNode {
					name: string;
					path: string;
					new?: boolean;
				}

				type FileSystemNode = BaseFileSystemNode & FileSystemNodeType;
				type FileSystemFolder = BaseFileSystemNode & FileSystemFolderType;
				type FileSystemFile = BaseFileSystemNode & FileSystemFileType;
			}
		}

		namespace Editor {
			interface Language {
				init: (monaco: typeof Monaco) => void;
				postInit?: (monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) => void;
				onDidChangeModelContent?: (
					model: Monaco.editor.ITextModel,
					e: Monaco.editor.IModelContentChangedEvent
				) => void;
				dispose?: () => void;
			}

			interface Theme {
				init: (monaco: typeof Monaco) => void;
				postInit?: (monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor) => void;
				dispose?: () => void;
			}

			interface Controller {
				activeModelPath?: string | null;
				addModel?: (value: string, uri: string, language?: string) => void;
				removeModel?: (uri: string) => void;
				getModel?: (uri: string) => Monaco.editor.ITextModel | null;
				setModel?: (uri: string | null) => void;
			}
		}

		namespace PageRenderer {
			type InitPageRequestType = { type: 'init-page'; canvas: OffscreenCanvas; svg: string };
			type RenderRequestType = { type: 'render'; svg?: string };
			type ResizeRequestType = { type: 'resize'; zoom: number };
			type DeleteRequestType = { type: 'delete' };
			type UpdateRequestType = { type: 'update'; maxWidth: number };

			type InitPageRequest = { pageId: number } & InitPageRequestType;
			type RenderRequest = { pageId: number } & RenderRequestType;
			type ResizeRequest = { pageId: number } & ResizeRequestType;
			type DeleteRequest = { pageId: number } & DeleteRequestType;
			type UpdateRequest = { pageId: number } & UpdateRequestType;

			type Request =
				| InitPageRequest
				| RenderRequest
				| ResizeRequest
				| DeleteRequest
				| UpdateRequest;

			type ErrorResponse = { type: 'error'; error: string };
			type SuccessRenderResponse = {
				type: 'render-success';
				pageId: number;
				dimensions: { width: number; height: number };
			};
			type SuccessResponse = { type: 'success'; pageId: number };

			type Response = ErrorResponse | SuccessResponse | SuccessRenderResponse;
		}

		namespace Compiler {
			type CompileRequest = { type: 'compile' };
			type EditRequest = {
				type: 'edit';
				file: string;
				content: string;
				offsetStart: number;
				offsetEnd: number;
			};
			type MoveRequest = { type: 'move'; old_path: string; new_path: string };
			type CompletionRequest = { type: 'completion'; file: string; offset: number };
			type DefinitionRequest = { type: 'definition'; file: string; offset: number };
			type InitRequest = { type: 'init'; root: string };
			type AddFileRequest = { type: 'add-file'; file: string; content: string };
			type SetRootRequest = { type: 'set-root'; root: string };
			type PrintFilesRequest = { type: 'print-files' };
			type TreeRequest = { type: 'ast-tree' };

			type Request =
				| CompileRequest
				| EditRequest
				| CompletionRequest
				| InitRequest
				| AddFileRequest
				| MoveRequest
				| SetRootRequest
				| PrintFilesRequest
				| DefinitionRequest
				| TreeRequest;

			interface CompileErrorSpan {
				file: string;
				range: Uint32Array;
			}
			interface CompileErrorType {
				span: CompileErrorSpan;
				message: string;
				severity: string;
				hints: string[];
				trace: CompileErrorSpan[];
			}

			interface CompletionItemType {
				label: string;
				kind: {
					kind: string;
					detail?: string;
				};
				apply?: string;
				detail?: string;
			}

			type DefaultErrorResponse = { sub: 'default'; error: string };
			type CompileErrorResponse = { sub: 'compile'; errors: Diagnostics[] };
			type ErrorResponse = { type: 'error' } & (DefaultErrorResponse | CompileErrorResponse);

			type CompileResponse = { type: 'compile'; svgs: string[] };
			type CompletionResponse = { type: 'completion'; completions: Completion[] };
			type DefinitionResponse = { type: 'definition'; definition: HoverProvider };
			type LoggerResponse = {
				type: 'logger';
				severity: 'error' | 'warn' | 'info';
				section: Sections;
				message: unknown[];
			};

			type Response =
				| ErrorResponse
				| CompileResponse
				| CompletionResponse
				| LoggerResponse
				| DefinitionResponse;
		}
	}

	namespace Flower {
		interface RawOperation {
			text: string;
			rangeOffset: number;
			rangeLength: number;
			restLength: number;
		}

		type Revision = { type: 'None' } | { type: 'Some'; number: number };

		type ActionType =
			| { type: 'Init'; projectId: string }
			| { type: 'OpenFile'; path: string }
			| { type: 'EditFile'; path: string; changes: RawOperation };

		interface ClientRequest {
			revision: Revision;
			clientId: string;
			parentRevision: number;
			timestamp: number;
			action: ActionType;
		}

		interface Entry {
			path: string;
			content: string;
			revision: Revision;
		}

		type PayloadType =
			| { type: 'Error'; message: string }
			| { type: 'InitOk'; files: Entry[] }
			| { type: 'OpenFileOk'; file: Entry }
			| { type: 'EditFileOk'; path: string };

		interface ServerResponse {
			revision: Revision;
			payload: PayloadType;
		}
	}
}

export {};
