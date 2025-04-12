import { auth } from '$lib/auth'; // path to your auth file
import { instanceSettings } from '$lib/instance-settings';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const publicPaths = [
	'/auth',
	'/api/login',
	'/api/auth/callback/github',
	'/api/auth/callback/discord',
	'/api/auth/sign-in/social',
	'/api/auth/error',
	'/callbacks/auth/social/error',
	'/favicon.ico'
];

const playgroundPath = '/playground';

const better_auth: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth });
};

const gatekeeper: Handle = async ({ event, resolve }) => {
	const { request, url } = event;
	const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));
	const isAuthenticated = await auth.api.getSession({
		headers: request.headers
	});

	const isPlaygroundPath = url.pathname.startsWith(playgroundPath);
	const isGatekeepingEnabled = instanceSettings.gatekeeping;
	const usePlayground = instanceSettings.playground;

	if (!isAuthenticated) {
		if (!isGatekeepingEnabled && usePlayground && isPlaygroundPath) {
			return resolve(event);
		}
		if (isPublicPath) {
			return resolve(event);
		}
		return Response.redirect(new URL('/auth', url));
	} else {
		if (url.pathname.startsWith('/auth')) {
			return Response.redirect(new URL('/', url));
		}
		return resolve(event);
	}
};

export const handle = sequence(better_auth, gatekeeper);
