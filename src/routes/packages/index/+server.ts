import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { eq, and, or } from 'drizzle-orm';

export async function GET({ locals }) {
	const ret: {
		name: string;
        uname: string;
		version: string;
		description: string;
	}[] = [];

	if (locals.user) {
		// TODO: add the projects from team members
		const publicArchivedPackages = await db
			.select()
			.from(table.archive)
			.innerJoin(table.projects, eq(table.archive.projectId, table.projects.id))
            .innerJoin(table.user, eq(table.projects.ownerId, table.user.id))
			.where(
				and(
					or(eq(table.projects.isPublic, true), eq(table.projects.ownerId, locals.user.id)),
					eq(table.projects.isPackage, true)
				)
			);

        for (const pkg of publicArchivedPackages) {
            ret.push({
                name: pkg.projects.name,
                uname: pkg.user.username,
                version: pkg.archive.version,
                description: pkg.projects.description ?? ''
            });
        }
	} else {
		const publicArchivedPackages = await db
			.select()
			.from(table.archive)
			.innerJoin(table.projects, eq(table.archive.projectId, table.projects.id))
            .innerJoin(table.user, eq(table.projects.ownerId, table.user.id))
			.where(and(eq(table.projects.isPublic, true), eq(table.projects.isPackage, true)));

		for (const pkg of publicArchivedPackages) {
			ret.push({
				name: pkg.projects.name,
                uname: pkg.user.username,
				version: pkg.archive.version,
				description: pkg.projects.description ?? ''
			});
		}
	}

	return json(ret);
}
