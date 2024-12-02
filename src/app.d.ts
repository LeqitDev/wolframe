// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Sections } from '$lib/logger.svelte';
import type { CoreCompletionItem } from '$lib/monaco';
import type { CompileError, CompletionWrapper } from '$rust/typst_flow_wasm';

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

		export namespace PageRenderer {
			type RenderRequestType = {type: 'render', svg: string; cached: boolean;};
			type ResizeRequestType = {type: 'resize', zoom: number;};
			type DeleteRequestType = {type: 'delete'};
			type UpdateRequestType = {type: 'update', maxWidth: number;};

			type RenderRequest = {pageId: number;} & RenderRequestType;
			type ResizeRequest = {pageId: number;} & ResizeRequestType;
			type DeleteRequest = {pageId: number;} & DeleteRequestType;
			type UpdateRequest = {pageId: number;} & UpdateRequestType;

			type Request = 
				| RenderRequest
				| ResizeRequest
				| DeleteRequest
				| UpdateRequest;

			type ErrorResponse = {type: 'error'; error: string;};
			type SuccessRenderResponse = {type: 'render-success'; pageId: number; png: string; dimensions: {width: number; height: number;}};
			type SuccessResponse = {type: 'success'; pageId: number;};

			type Response = 
				| ErrorResponse
				| SuccessResponse
				| SuccessRenderResponse;
		}

		export namespace Compiler {
			type CompileRequest = {type: 'compile'}
			type EditRequest = {type: 'edit', file: string, content: string, offsetStart: number, offsetEnd: number};
			type CompletionRequest = {type: 'completion', file: string, offset: number};
			type InitRequest = {type: 'init', root: string};
			type AddFileRequest = {type: 'add-file', file: string, content: string};

			type Request = CompileRequest | EditRequest | CompletionRequest | InitRequest | AddFileRequest;

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

			type DefaultErrorResponse = {sub: 'default'; error: string;};
			type CompileErrorResponse = {sub: 'compile'; errors: CompileErrorType[];};
			type ErrorResponse = {type: 'error';} & (DefaultErrorResponse | CompileErrorResponse);

			type CompileResponse = {type: 'compile'; svgs: string[]};
			type CompletionResponse = {type: 'completion'; completions: CoreCompletionItem[]};
			type LoggerResponse = {type: 'logger'; severity: 'error' | 'warn' | 'info'; section: Sections; message: any[]; }

			type Response = ErrorResponse | CompileResponse | CompletionResponse | LoggerResponse;
		}
	}
}

export {};
