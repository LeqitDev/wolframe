<script lang="ts">
	import logo from '$lib/assets/wolframe-icon.svg';
	import { authClient } from '$lib/auth-client';
	import { instanceSettings } from '$lib/instance-settings';
    import hotkeys from 'hotkeys-js';
	import { elasticOut } from 'svelte/easing';
	import { fade, scale, slide } from 'svelte/transition';

    const session = authClient.useSession();

    let search_field: HTMLInputElement;
    let search_field_focused = $state(false);

    function search_field_blur() {
        search_field_focused = false;
    }

    function search_field_focus() {
        search_field_focused = true;
    }

    function search_field_hotkey_focus(event: KeyboardEvent) {
        event.preventDefault();
        if (search_field) {
            search_field.focus();
        }
    }

    function search_field_hotkey_blur(event: KeyboardEvent) {
        event.preventDefault();
        if (search_field) {
            search_field.blur();
        }
    }

    $effect(() => {
        hotkeys.filter = function(event){ // does not really work as expected, false has no effect
            if (event.target !== search_field && event.key === 'escape') {
                return false;
            }
            return true;
        }
        hotkeys('ctrl+k, command+k', search_field_hotkey_focus);

        hotkeys('escape', search_field_hotkey_blur);

        search_field.addEventListener('blur', search_field_blur);

        search_field.addEventListener('focus', search_field_focus);

        return () => {
            hotkeys.unbind('ctrl+k, command+k', search_field_hotkey_focus);
            hotkeys.unbind('esc', search_field_hotkey_blur);
            search_field.removeEventListener('blur', search_field_blur);
            search_field.removeEventListener('focus', search_field_focus);
        }
    });
</script>

<div class="navbar bg-base-300 shadow-white/20">
	<div class="navbar-start">
		<a class="btn btn-ghost text-lg" href="/">
            <div class="bg-white rounded">
                <img src={logo} alt="Logo" class="size-8" />
            </div>
			<span class="text-shadow-sm text-shadow-primary tracking-wider">Wolframe</span>
		</a>

		<ul class="menu menu-horizontal gap-2">
			<li><a href="/proejcts">Projects</a></li>
			<li><a href="/teams">Teams</a></li>
            {#if instanceSettings.playground}
                <li><a href="/playground">Playground</a></li>
            {/if}
		</ul>
	</div>

    <div class="navbar-center relative">
        <label class="input w-72 transition-all duration-300 ease-in-out focus-within:w-sm focus-within:z-20">
            <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></g></svg>
            <input type="search" class="grow" placeholder="Search" bind:this={search_field} />
            <kbd class="kbd kbd-sm">⌘</kbd>
            <kbd class="kbd kbd-sm">K</kbd>
        </label>
        {#if search_field_focused}
            <div transition:scale role="presentation" class="absolute top-0 left-0 w-full max-h-72 bg-base-100 rounded border border-base-content/20 z-20 mt-14" onmousedown={(e) => e.preventDefault()}>
                <ul class="list">
                    <!-- <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Recent Searches</li> -->
                    <li class="p-4 not-last:pb-2 text-xs opacity-60 tracking-wide">Try <span class="px-1 py-0.5 bg-primary/30 font-bold">projectname</span></li>
                    <li class="p-4 not-last:pb-2 text-xs opacity-60 tracking-wide">Find projects related to a team with <span class="px-1 py-0.5 bg-primary/30"><span class="font-bold">team</span>:teamname</span></li>
                    <li class="p-4 not-last:pb-2 text-xs opacity-60 tracking-wide">Search <span class="px-1 py-0.5 bg-primary/30"><span class="font-bold">file</span>:filename</span> to find a file inside a project</li>
                    <!-- <li class="p-4 text-xs opacity-60 tracking-wide">
                        Search for <a class="font-bold" href="/lol" onmousedown={(e) => e.preventDefault()}>"Lorem ipsum dolor sit amet"</a>
                    </li> -->
                </ul>
            </div>
        {/if}
    </div>

    <div class="navbar-end">
        <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar shadow-sm shadow-primary size-9">
                <div class="w-full rounded-full">
                    <img
                        alt="Avatar"
                        src={$session.data?.user.image ?? "https://api.dicebear.com/9.x/identicon/svg?backgroundColor=15191e,ffffff&seed=" + $session.data?.user.name}
                    />
                </div>
            </div>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
                tabindex="0"
                class="dropdown-content bg-base-100 z-1 mt-3 p-2 rounded border border-base-content/20"
            >
                <div class="card card-sm">
                    <div class="card-body">
                        <h2 class="card-title">{$session.data?.user.name}</h2>
                        <p class="text-xs">{$session.data?.user.email}</p>
                    </div>
                </div>
                <ul class="menu menu-sm w-full gap-2">
                    <li><a href="/settings">Settings</a></li>
                    <li><a href="/logout">Logout</a></li>
                </ul>
            </div>
        </div>
    </div>
</div>

{#if search_field_focused}
    <div transition:fade class="w-screen h-screen bg-black/10 absolute top-0 left-0 z-10 filter backdrop-blur-sm">
    </div>
{/if}