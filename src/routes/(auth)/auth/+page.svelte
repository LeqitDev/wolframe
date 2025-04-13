<script lang="ts">
	import { superForm } from "sveltekit-superforms";
    import logo from "$lib/assets/wolframe-icon.svg";
	import type { PageProps } from "./$types";
	import { instanceSettings } from "$lib/instance-settings";
	import { zod } from "sveltekit-superforms/adapters";
	import { loginSchema, registerSchema } from "./schemas";
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";

    let {
        data
    }: PageProps = $props();

    let formLoading: boolean = $state(false);

    const {
        form: login,
        errors: loginErrors,
        enhance: loginEnhance,
        delayed: loginDelayed,
    } = superForm(data.loginForm, {
        delayMs: 500,
        validators: zod(loginSchema),
        validationMethod: "onblur",
        onSubmit(input) {
            formLoading = true;
        },
        onResult(event) {
            formLoading = false;
            console.log(event.result);
            if (event.result.type === "success") {
                goto("/", { replaceState: true });
            }
        }
    });

    const {
        form: register,
        errors: registerErrors,
        enhance: registerEnhance,
        delayed: registerDelayed,
    } = superForm(data.registerForm, {
        delayMs: 500,
        validators: zod(registerSchema),
        validationMethod: "onblur",
        onSubmit(input) {
            formLoading = true;
        },
        onResult() {
            formLoading = false;
        }
    });

    const anySocialAuthMethods = instanceSettings.authMethods.discord || instanceSettings.authMethods.github;
    const anyAuthMethods = anySocialAuthMethods || instanceSettings.authMethods.emailAndPassword;

    const githubSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: "github",
                callbackURL: "/callbacks/auth/social/success",
                errorCallbackURL: "/auth",
            });
        } catch (error) {
            console.error("Error during Discord sign-in:", error);
        }
    }

    const discordSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: "discord",
                callbackURL: "/callbacks/auth/social/success",
                errorCallbackURL: "/callbacks/auth/social/error",
            });
        } catch (error) {
            console.error("Error during Discord sign-in:", error);
        }
    }
</script>

{#snippet loginFormSnippet()}
    <form method="POST" action="?/login" class="fieldset gap-2 w-xs" use:loginEnhance>
        <div class="fieldset">
            <label for="email" class="fieldset-label">Email</label>
            <input type="email" class={["input w-full", $loginErrors.email || $loginErrors._errors ? 'border-error' : '']} name="email" id="email" bind:value={$login.email} required />
            {#if $loginErrors.email}<p class="fieldset-label text-error">{$loginErrors.email}</p>{/if}
        </div>

        <div class="fieldset">
            <label for="password" class="fieldset-label">Password</label>
            <input type="password" class={["input w-full", $loginErrors.password || $loginErrors._errors ? 'border-error' : '']} name="password" id="password" bind:value={$login.password} required />
            {#if $loginErrors.password}<p class="fieldset-label text-error">{$loginErrors.password}</p>{/if}
        </div>

        <div class="fieldset flex items-center gap-2">
            <input type="checkbox" class="checkbox" name="remember" id="remember" bind:checked={$login.remember} />
            <label for="remember" class="label cursor-pointer">Remember me</label>
            {#if $loginErrors.remember}<p class="fieldset-label text-error">{$loginErrors.remember}</p>{/if}
        </div>

        {#if $loginErrors._errors}
            <p class="text-sm text-error mt-2">{$loginErrors._errors}</p>
        {/if}

        <button type="submit" class={"btn btn-neutral mt-4"} disabled={formLoading}>
            {#if formLoading && $loginDelayed}
                <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Login
        </button>
    </form>
{/snippet}

{#snippet registerFormSnippet()}
    <form method="POST" action="?/register" class="fieldset gap-2 w-xs" use:registerEnhance>
        <div class="fieldset">
            <label for="name" class="fieldset-label">Displayname</label>
            <input type="text" class={["input w-full", $registerErrors.name || $registerErrors._errors ? 'border-error' : '']} name="name" id="name" bind:value={$register.name} required />
            {#if $registerErrors.name}<p class="fieldset-label text-error">{$registerErrors.name}</p>{/if}
        </div>

        <div class="fieldset">
            <label for="email" class="fieldset-label">Email</label>
            <input type="email" class={["input w-full", $registerErrors.email || $registerErrors._errors ? 'border-error' : '']} name="email" id="email" bind:value={$register.email} required />
            {#if $registerErrors.email}<p class="fieldset-label text-error">{$registerErrors.email}</p>{/if}
        </div>

        <div class="fieldset">
            <label for="password" class="fieldset-label">Password</label>
            <input type="password" class={["input w-full", $registerErrors.password || $registerErrors._errors ? 'border-error' : '']} name="password" id="password" bind:value={$register.password} required />
            {#if $registerErrors.password}<p class="fieldset-label text-error">{$registerErrors.password}</p>{/if}
        </div>

        <div class="fieldset">
            <label for="passwordConfirm" class="fieldset-label">Confirm Password</label>
            <input type="password" class={["input w-full", $registerErrors.passwordConfirm || $registerErrors._errors ? 'border-error' : '']} name="passwordConfirm" id="passwordConfirm" bind:value={$register.passwordConfirm} required />
            {#if $registerErrors.passwordConfirm}<p class="fieldset-label text-error">{$registerErrors.passwordConfirm}</p>{/if}
        </div>

        {#if $registerErrors._errors}
            <p class="text-sm text-error mt-2">{$registerErrors._errors}</p>
        {/if}

        <button type="submit" class="btn btn-neutral mt-4" disabled={formLoading}>
            {#if formLoading && $registerDelayed}
                <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Register
        </button>
    </form>
{/snippet}

{#if anyAuthMethods}
<div class="flex flex-col items-center justify-center h-screen">
    <div class="card card-side bg-base-100 shadow-sm shadow-primary/50 min-h-[51%]">
        <div class="flex flex-col items-center justify-center bg-base-300 px-8 gap-2">
            <img src={logo} alt="Logo" class="rounded-sm size-14 mb-6 -mt-12 shadow-lg shadow-primary/50 bg-white" />
            <div>
                <h1 class="text-2xl font-bold">Welcome to Wolframe</h1>
                {#if instanceSettings.instanceName !== "Default Instance"}<p class="text-sm text-center">{instanceSettings.instanceName} Instance</p>{/if}
            </div>
            <div class="grid grid-cols-1 gap-1 text-center text-base-content/70">
                <p class="text-sm">Please login or register to continue</p>
                <p class="text-sm">If you don't have an account, please register</p>
            </div>
        </div>
        <div class="card-body bg-base-200">
            <div class="tabs tabs-border w-xs">
                <label class="tab before:border-primary! before:bg-transparent!">
                    <input type="radio" name="tab" checked disabled={formLoading} />
                    <h2 class="card-title">Login</h2>
                </label>
                <div class="tab-content mt-2">
                    {@render loginFormSnippet()}
                    {#if anySocialAuthMethods}
                        <div class="divider">OR</div>
                        <div class="grid grid-cols-1 gap-2 text-center">
                            {#if instanceSettings.authMethods.github}
                                <button class="btn btn-soft btn-black not-hover:bg-black/20" onclick={githubSignIn}>
                                    <svg aria-label="GitHub logo" width="17" height="17" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path></svg>
                                    Login with GitHub
                                </button>
                            {/if}
                            {#if instanceSettings.authMethods.discord}
                                <button class="btn btn-soft btn-discord" onclick={discordSignIn}>
                                    <svg id="Discord-Logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 126.644 96"><defs><style>.cls-1{fill:#fff;}</style></defs><path id="Discord-Symbol-White" class="cls-1" d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/></svg>
                                    Login with Discord
                                </button>
                            {/if}
                        </div>
                    {/if}
                </div>

                <label class="tab before:border-primary! before:bg-transparent!">
                    <input type="radio" name="tab" />
                    <h2 class="card-title">Register</h2>
                </label>
                <div class="tab-content mt-2">
                    {@render registerFormSnippet()}
                </div>
            </div>
        </div>
    </div>
</div>
{:else}
    <div class="flex flex-col items-center justify-center h-screen">
        <div class="card bg-base-100 shadow-sm shadow-primary/50">
            <div class="card-body items-center text-center">
                <h2 class="card-title mb-4">Welcome to Wolframe</h2>
                <p class="font-bold">It looks like the instance admin hasn't configured any authentication methods.</p>
                <p class="font-bold">Please use the website without login (local) or contact the instance admin to get access.</p>
                <p class="text-sm">Instance: {instanceSettings.instanceName}</p>
                <button class="btn btn-link mt-4" onclick={() => window.location.href = "/"}>Go to homepage</button>
            </div>
        </div>
    </div>
{/if}