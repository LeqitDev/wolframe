import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    if (!event.locals.user) {
		throw redirect(302, '/');
	}

    const vfs: { filename: string, content: string }[] = [];

    vfs.push({ filename: "/main.typ", content: "" });

    return { project: {
        id: '0',
        name: 'Playground',
        isPackage: false,
    }, files: [
        { path: '/main.typ', filename: 'main.typ', content: '' },
    ], user: event.locals.user, project_path: '/', initial_vfs: vfs };
};