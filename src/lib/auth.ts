import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { instanceSettings } from './instance-settings';
import { env } from '$env/dynamic/private';

console.log('Auth methods:', instanceSettings.authMethods, env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET, env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
    }),
    emailAndPassword: {  
        enabled: instanceSettings.authMethods.emailAndPassword
    },
    socialProviders: {
        discord: instanceSettings.authMethods.discord ? {
            clientId: env.DISCORD_CLIENT_ID!,
            clientSecret: env.DISCORD_CLIENT_SECRET!,
        } : undefined,
        github: instanceSettings.authMethods.github ? {
            clientId: env.GITHUB_CLIENT_ID!,
            clientSecret: env.GITHUB_CLIENT_SECRET!,
        } : undefined,
    }
});