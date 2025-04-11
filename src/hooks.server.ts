import { auth } from '$lib/auth'; // path to your auth file
import { instanceSettings } from '$lib/instance-settings';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const publicPaths = ['/auth', '/api/login', '/api/auth/callback/github', '/api/auth/callback/discord', '/api/auth/sign-in/social', '/api/auth/error', '/favicon.ico'];

const playgroundPath = '/playground';

export async function handle({ event, resolve }) {
	const { request, url } = event;
	const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));
	const isAuthenticated = await auth.api.getSession({
		headers: request.headers
	});

	const isPlaygroundPath = url.pathname.startsWith(playgroundPath);
	const isGatekeepingEnabled = instanceSettings.gatekeeping;
	const usePlayground = instanceSettings.playground;

	console.log('requested url:', url.href);

	if (!isAuthenticated) {
		if (!isGatekeepingEnabled && usePlayground && isPlaygroundPath) {
			return svelteKitHandler({ event, resolve, auth });
		}
		if (isPublicPath) {
			return svelteKitHandler({ event, resolve, auth });
		}
		return Response.redirect(new URL('/auth', url));
	} else {
		if (url.pathname.startsWith('/auth')) {
			return Response.redirect(new URL('/', url));
		}
		return svelteKitHandler({ event, resolve, auth });
	}
}
