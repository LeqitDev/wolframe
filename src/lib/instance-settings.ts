import { env } from '$env/dynamic/public';

export const instanceSettings = {
    gatekeeping: env.PUBLIC_IS_GATEKEEPING === 'true', // Enable or disable un-authenticated access to the playground
    playground: env.PUBLIC_USE_PLAYGROUND === 'true', // Enable or disable the playground
    instanceName: env.PUBLIC_INSTANCE_NAME ?? 'Default Instance', // Instance name to be displayed in the app
    authMethods: { // Auth methods to be used in the app
        emailAndPassword: env.PUBLIC_USE_EMAIL_AND_PASSWORD_AUTH === 'true',
        discord: env.PUBLIC_USE_DISCORD_AUTH === 'true',
        github: env.PUBLIC_USE_GITHUB_AUTH === 'true',
    }
};