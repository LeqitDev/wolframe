import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { getPath, minio } from "$lib/server/bucket";

export const load: LayoutServerLoad = async (event) => {
    if (!event.locals.user) {
		throw redirect(302, '/');
	}

    const slug = event.params.projectId;

    const project = await db.select().from(table.projects).where(eq(table.projects.id, slug));

    if (!project) {
        throw redirect(302, '/');
    }

    const project_path = getPath(null, event.locals.user.id, slug, null);

    const files = await minio.listFiles(project_path);

    const vfs: { filename: string, content: string }[] = [];

    // Fetch the main file, if not exist the first in the list
    if (files.length > 0) {
        const mainFile = files.find((file) => file.filename === "main.typ");
        if (mainFile) {
            const mainContent = await minio.downloadFile(mainFile.path);
            vfs.push({ filename: "main.typ", content: mainContent.toString() });
        } else {
            const mainContent = await minio.downloadFile(files[0].path);
            vfs.push({ filename: files[0].filename, content: mainContent.toString() });
        }
    }

    return { project: project.at(0), user: event.locals.user, files: files, project_path, initial_vfs: vfs };
};