import { hash, verify } from '@node-rs/argon2';
import { encodeBase64url } from '@oslojs/encoding';
import { fail, redirect } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { newProjectSchema } from '$lib/forms/schema';
import { zod } from 'sveltekit-superforms/adapters';
import { minio } from '$lib/server/bucket';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return { user: null };
	}

	const projects = await db
		.select({
			projects: table.projects,
			teamMembersCount: db.$count(table.teamMembers, eq(table.teamMembers.teamId, table.projects.teamId)),
		})
		.from(table.projects)
		.leftJoin(table.teamMembers, eq(table.projects.teamId, table.teamMembers.teamId))
		.where(or(eq(table.projects.ownerId, event.locals.user.id), eq(table.projects.teamId, table.teamMembers.teamId)));

	const teams = await db
		.select()
		.from(table.teamMembers)
		.where(eq(table.teamMembers.userId, event.locals.user.id))
		.innerJoin(table.teams, eq(table.teams.id, table.teamMembers.teamId));

	const invites = await db
		.select()
		.from(table.teamInvites)
		.where(eq(table.teamInvites.userId, event.locals.user.id));

	const newProjectForm = await superValidate(zod(newProjectSchema));

	return { user: event.locals.user, projects, teams, invites, newProjectForm };
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const results = await db.select().from(table.user).where(eq(table.user.username, username));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!validPassword) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/');
	},
	logout: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}
		await auth.invalidateSession(event.locals.session.id);
		auth.deleteSessionTokenCookie(event);

		return redirect(302, '/');
	},
	register: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const userId = generateUserId();
		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		try {
			await db.insert(table.user).values({ id: userId, username, passwordHash });

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (e) {
			return fail(500, { message: 'An error has occurred', error: e });
		}
		return redirect(302, '/');
	},
	new_project: async (event) => {
		const form = await superValidate(event, zod(newProjectSchema));
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		if (!event.locals.user) {
			return fail(401);
		}

		const newPorject: table.NewProject = {
			name: form.data.name,
			description: form.data.description,
			ownerId: event.locals.user.id,
			teamId: form.data.teamId,
			isPublic: form.data.isPublic,
			createdAt: new Date()
		}

		const proj = await db.insert(table.projects).values(newPorject).returning({ id: table.projects.id });

		if (!proj.length) {
			return fail(500, { message: 'An error has occurred' });
		}

		minio.uploadProjectFile(proj[0].id, null, 'main.typ', Buffer.from(''), {
			"userId": event.locals.user.id,
		}).catch(console.error);

		await db.insert(table.files).values({
			projectId: proj[0].id,
			path: `users/${event.locals.user.id}/projects/${proj[0].id}/files`,
			name: 'main.typ',
			size: 0,
			createdAt: new Date(),
		});

		return redirect(302, `/project/${proj[0].id}`);
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase64url(bytes);
	return id;
}

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
