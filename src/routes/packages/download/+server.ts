import { getPath, minio } from '$lib/server/bucket/index.js';
import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { createTarGzip } from 'nanotar';
import { parse } from 'toml';

export async function GET({ locals, url }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!url.searchParams.has('version')) {
		return new Response('Missing version', { status: 400 });
	}

	let projectId;

	if (url.searchParams.has('pid')) {
		projectId = url.searchParams.get('pid')!;
	} else if (url.searchParams.has('uname') && url.searchParams.has('pname')) {
		const projects = await db
			.select()
			.from(table.projects)
			.leftJoin(table.teamMembers, eq(table.projects.teamId, table.teamMembers.teamId))
			.leftJoin(table.user, eq(table.projects.ownerId, table.user.id))
			.where(
				and(
					eq(table.projects.name, url.searchParams.get('pname')!),
					eq(table.user.username, url.searchParams.get('uname')!),
					or(
						eq(table.projects.isPublic, true),
						eq(table.projects.ownerId, locals.user.id),
						eq(table.teamMembers.userId, locals.user.id)
					)
				)
			);

		if (projects.length === 0) {
			return new Response('Not found', { status: 404 });
		} else if (!projects[0].projects.isPackage) {
			return new Response('Project not declared as package', { status: 400 });
		}

		projectId = projects[0].projects.id;
	} else {
		return new Response('Missing project id', { status: 400 });
	}

	const version = url.searchParams.get('version')!;

	let tar;
	let name = '';

	if (version === 'latest') {
		return new Response('Deprecated endpoint! Use the version format major.minor.patch (e.g. 3.1.4)', { status: 501 });

		const projects = await db
			.select()
			.from(table.projects)
			.leftJoin(table.teamMembers, eq(table.projects.teamId, table.teamMembers.teamId))
			.where(
				and(
					eq(table.projects.id, projectId),
					or(
						eq(table.projects.isPublic, true),
						eq(table.projects.ownerId, locals.user!.id),
						eq(table.teamMembers.userId, locals.user!.id)
					)
				)
			);

		if (projects.length === 0) {
			return new Response('Not found', { status: 404 });
		} else if (!projects[0].projects.isPackage) {
			return new Response('Project not declared as package', { status: 400 });
		}

		const project = projects[0];

		const projectPath = getPath(project.projects.teamId, project.projects.ownerId, projectId, null)
			.split('/')
			.filter((value) => value.length > 0)
			.join('/');

		const minioFiles = await minio.listFiles(projectPath);

		if (minioFiles.length === 0) {
			return new Response('No files found', { status: 404 });
		} else if (minioFiles.find((file) => file.path === projectPath + '/typst.toml') === undefined) {
			return new Response('No toml file found', { status: 404 });
		}

		const files: { name: string; data: string }[] = [];
		for (const file of minioFiles) {
			const data = await minio.downloadFile(file.path);
			console.log(file.path, data.toString());
			files.push({
				name: file.path.replace(`${projectPath}/`, ''),
				data: data.toString()
			});
		}

		const toml_file = files.find((file) => file.name === 'typst.toml');
		if (toml_file === undefined) {
			return new Response('No toml file found', { status: 404 });
		}
		const toml = parse(toml_file!.data);

		console.log(files);

		if (
			!toml.package.name ||
			!toml.package.version ||
			!toml.package.entrypoint ||
			(toml.package.name && toml.package.name !== project.projects.name)
		) {
			return new Response('Invalid toml file', { status: 400 });
		}

		if (
			toml.package.entrypoint &&
			files.find((file) => file.name === toml.package.entrypoint) === undefined
		) {
			return new Response('Entrypoint not found', { status: 404 });
		}

		tar = await createTarGzip(files);
		name = `${project.projects.name}-${toml.package.version}`;
	} else {
		const archives = await db
			.select()
			.from(table.archive)
			.innerJoin(table.projects, eq(table.projects.id, projectId))
			.where(and(eq(table.archive.projectId, projectId), eq(table.archive.version, version)));

		if (archives.length === 0) {
			return new Response('Version not found', { status: 404 });
		} else if (!archives[0].projects.isPackage) {
			return new Response('Project not declared as package', { status: 400 });
		}
		const archive = archives[0];

		tar = await minio.downloadFile(
			archive.archive.projectId + '/' + archive.archive.version + '.tar.gz'
		);
		name = `${archive.projects.name}-${version}`;
	}

	return new Response(tar, {
		status: 200,
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Disposition': `attachment; filename="${name}.tar.gz"`
		}
	});
}
