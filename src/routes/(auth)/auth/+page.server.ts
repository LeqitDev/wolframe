
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { auth } from '$lib/auth.js';
import { APIError } from 'better-auth/api';
import { loginSchema, registerSchema } from './schemas';



export const load = async () => {
    const loginForm = await superValidate(zod(loginSchema));
    const registerForm = await superValidate(zod(registerSchema));

    return {
        loginForm,
        registerForm,
    }
}

export const actions = {
    login: async ({ request, cookies }) => {
        const form = await superValidate(request, zod(loginSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            // https://github.com/better-auth/better-auth/issues/600
            const signin = await auth.api.signInEmail({
                body: {
                    email: form.data.email,
                    password: form.data.password,
                    remember: form.data.remember,
                },
                headers: request.headers,
                asResponse: true,
            });

            const setCookieHeader = signin.headers.get('Set-Cookie');
            if (setCookieHeader) {
                const parsedCookie = setCookieHeader.split(';')[0];
                const [name, encodedValue] = parsedCookie.split('=');

                const decodedValue = decodeURIComponent(encodedValue);
                cookies.set(name, decodedValue, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7, // 1 week
                    secure: true,
                });

            }

            return message(form, "Login successful");
        } catch (error) {
            if (error instanceof APIError) {
                return setError(form, error.message);
            }
        }
    },
    register: async ({ request, cookies }) => {
        const form = await superValidate(request, zod(registerSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            const signup = await auth.api.signUpEmail({
                body: {
                    email: form.data.email,
                    password: form.data.password,
                    name: form.data.name,
                },
                headers: request.headers,
                asResponse: true,
            });

            const setCookieHeader = signup.headers.get('Set-Cookie');
            if (setCookieHeader) {
                const parsedCookie = setCookieHeader.split(';')[0];
                const [name, encodedValue] = parsedCookie.split('=');

                const decodedValue = decodeURIComponent(encodedValue);
                cookies.set(name, decodedValue, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7, // 1 week
                    secure: true,
                });
            }

            return message(form, 'Registration successful');
        } catch (error) {
            if (error instanceof APIError) {
                return setError(form, error.message);
            }
        }
    }
};