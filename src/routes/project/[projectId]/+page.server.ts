import { db } from "$lib/server/db";
import { redirect, type Actions } from "@sveltejs/kit";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { getPath, minio } from "$lib/server/bucket";

export const actions: Actions = {
    delete: async (event) => {
        if (!event.locals.user) {
            throw redirect(302, "/");
        }
        const slug = event.params.projectId;

        await db.delete(table.projects).where(eq(table.projects.id, slug!));
        await db.delete(table.files).where(eq(table.files.projectId, slug!));

        // TODO: delete files from bucket
        minio.deleteFiles(getPath(null, event.locals.user.id, slug!, null));

        throw redirect(302, "/");
    },
};