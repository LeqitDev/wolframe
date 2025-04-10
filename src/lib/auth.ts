import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { instanceSettings } from './instance-settings';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
    }),
    emailAndPassword: {  
        enabled: instanceSettings.authMethods.emailAndPassword
    },
    socialProviders: {
        discord: instanceSettings.authMethods.discord ? {
            // @ts-expect-error: process not defined
            clientId: process.env.DISCORD_CLIENT_ID,
            // @ts-expect-error: process not defined
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        } : undefined,
        github: instanceSettings.authMethods.github ? {
            // @ts-expect-error: process not defined
            clientId: process.env.GITHUB_CLIENT_ID,
            // @ts-expect-error: process not defined
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        } : undefined,
    }
});