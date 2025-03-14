import * as Minio from 'minio';

import { env } from '$env/dynamic/private';

// Types for our file operations

export class MinioService {
	private client: Minio.Client;
	private bucket: string;

	constructor() {
		if (!env.MINIO_USER) throw new Error('MINIO_USER is not set');
		if (!env.MINIO_PW) throw new Error('MINIO_PW is not set');
		if (!env.MINIO_BUCKET) throw new Error('MINIO_BUCKET is not set');
		if (!env.MINIO_ENDPOINT) throw new Error('MINIO_ENDPOINT is not set');
		if (!env.MINIO_PORT) throw new Error('MINIO_PORT is not set');

		this.client = new Minio.Client({
			endPoint: env.MINIO_ENDPOINT,
			port: parseInt(env.MINIO_PORT),
			useSSL: parseInt(env.MINIO_PORT) == 443 ? true : false,
			accessKey: env.MINIO_USER,
			secretKey: env.MINIO_PW
		});
		this.bucket = env.MINIO_BUCKET;

		this.initialize().catch((error) => {
			console.error('Failed to initialize Minio bucket:', error);
		});
	}

	/**
	 * Initialize bucket if it doesn't exist
	 */
	async initialize(): Promise<void> {
		const exists = await this.client.bucketExists(this.bucket);
		if (!exists) {
			await this.client.makeBucket(this.bucket);
			// Set bucket policy if needed
			// await this.client.setBucketPolicy(...)
		}
	}

	/**
	 * Upload a file to Minio
	 */
	async uploadFile(
		path: string,
		file: Buffer | Readable,
		metadata: { [key: string]: string } = {}
	): Promise<App.UploadResult> {
		const objectName = path.startsWith('/') ? path.slice(1) : path;

		const result = await this.client.putObject(
			this.bucket,
			objectName,
			file,
			undefined, // Size (optional)
			metadata
		);

		return {
			path: objectName,
			size: Buffer.isBuffer(file) ? file.length : 0,
			etag: result.etag
		};
	}

	/**
	 * Upload a file specifically for a project
	 */
	async uploadProjectFile(
		projectId: string,
		teamId: string | null,
		fileName: string,
		file: Buffer | Readable,
		metadata: { [key: string]: string } = {}
	): Promise<App.UploadResult> {
		return this.uploadFile(getPath(teamId, metadata.userId, projectId, fileName), file, metadata);
	}

	/**
	 * Download a file from Minio
	 */
	async downloadFile(path: string): Promise<Buffer> {
		const objectName = path.startsWith('/') ? path.slice(1) : path;
		const dataStream = await this.client.getObject(this.bucket, objectName);

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			dataStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			dataStream.on('end', () => resolve(Buffer.concat(chunks)));
			dataStream.on('error', reject);
		});
	}

	/**
	 * Get file metadata
	 */
	async getFileMetadata(path: string): Promise<App.FileMetadata | null> {
		try {
			const objectName = path.startsWith('/') ? path.slice(1) : path;
			const stat = await this.client.statObject(this.bucket, objectName);
			const fileName = path.split('/').pop() || '';
			return {
				filename: fileName,
				mimetype: stat.metaData['content-type'] || 'application/octet-stream',
				size: stat.size,
				lastModified: stat.lastModified,
				etag: stat.etag,
				path: path.replace(fileName, '')
			};
		} catch (error) {
			if ((error as any).code === 'NotFound') {
				return null;
			}
			throw error;
		}
	}

	/**
	 * List files in a directory
	 */
	async listFiles(prefix: string): Promise<App.FileMetadata[]> {
		const objectsList: App.FileMetadata[] = [];
		const stream = this.client.listObjects(this.bucket, prefix, true);
		let counter = 0;

		return new Promise((resolve, reject) => {
			stream.on('data', async (obj) => {
				if (obj.name) {
					counter++;
					const metadata = await this.getFileMetadata(obj.name);
					if (metadata) {
						objectsList.push({...metadata, path: obj.name});
					}
					counter--;
				}
			});

			stream.on('end', () => {
				// Wait for all metadata to be fetched
				const interval = setInterval(() => {
					if (counter === 0) {
						clearInterval(interval);
						resolve(objectsList);
					}
				}, 100);
			});
			stream.on('error', reject);
		});
	}

	/**
	 * Delete a file
	 */
	async deleteFile(path: string): Promise<void> {
		const objectName = path.startsWith('/') ? path.slice(1) : path;
		await this.client.removeObject(this.bucket, objectName);
	}

	/**
	 * Delete all files in a directory
	 */
	async deleteFiles(prefix: string): Promise<void> {
		const stream = this.client.listObjects(this.bucket, prefix, true);
		const objects: string[] = [];

		stream.on('data', (obj) => {
			if (obj.name) {
				objects.push(obj.name);
			}
		});

		stream.on('end', () => {
			objects.forEach((object) => {
				this.client.removeObject(this.bucket, object);
			});
		});
	}
}

export const minio = new MinioService();

export const getPath = (teamId: string | null, userId: string | null, projectId: string, fileName: string | null) => {
	if (!teamId && !userId) throw new Error('teamId or userId must be provided');

	const prefix = teamId
		? `teams/${teamId}/projects/${projectId}/files/`
		: `users/${userId}/projects/${projectId}/files/`;
	
	return fileName ? `${prefix}${fileName}` : prefix;
}