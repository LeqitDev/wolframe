import { getPath, minio } from '$lib/server/bucket/index.js';
import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { createTarGzip } from 'nanotar';

export async function GET({ locals, params }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const { projectId } = params;

	const projects = await db
		.select()
		.from(table.projects)
		.leftJoin(table.teamMembers, eq(table.projects.teamId, table.teamMembers.teamId))
		.where(
			and(
				eq(table.projects.id, projectId),
				or(
					eq(table.projects.isPublic, true),
					eq(table.projects.ownerId, locals.user.id),
					eq(table.teamMembers.userId, locals.user.id)
				)
			)
		);

    if (projects.length === 0) {
        return new Response('Not found', { status: 404 });
    }
    const project = projects[0];

    const projectPath = getPath(project.projects.teamId, project.projects.ownerId, projectId, null).split('/').filter((value) => value.length > 0).join('/');

    const minioFiles = await minio.listFiles(projectPath);

    // TODO: check for a toml and entrypoint file

    const files : {name: string; data: string;}[] = []; 
    for (const file of minioFiles) {
        const data = await minio.downloadFile(file.path);
        console.log(file.path, data.toString());
        files.push({
            name: file.path.replace(`${projectPath}/`, ''),
            data: data.toString(),
        });
    }

    console.log(files);
    
    const tar = await createTarGzip(files);

	return new Response(tar, { status: 200, headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${project.projects.name}.tar.gz"` } });
}
