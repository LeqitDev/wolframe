// See https://svelte.dev/docs/kit/types#app.d.ts
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

			type Request = {pageId: number;} & ({
				type: 'render';
				svg: string;
				recompile: false;
			} | {
				type: 'render';
				canvas?: OffscreenCanvas;
				svg: string;
				recompile: true;
			} | {
				type: 'resize';
				width: number;
				height: number;
				preserveAspectRatio?: boolean | string;
			});

			type Response = {
				type: 'error';
				error: string;
			} | {
				type: 'success';
				pageId: number;
				width: number;
				height: number;
			};
		}
	}
}

export {};
