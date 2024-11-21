<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import type { PageData } from './$types';
	import { createProjectStore, getProjectStore } from '$lib/stores/project.svelte';

	let { children, data }: { children: any; data: PageData } = $props();

	createProjectStore();
	const store = getProjectStore();
</script>

{#snippet menu({ data }: { data: App.IProjectMenu })}
	<Menubar.Menu>
		<Menubar.Trigger>{data.name}</Menubar.Trigger>
		<Menubar.Content>
			{#each data.actions as action}
				<Menubar.Item onclick={action.onclick}>
					{action.name}
					{#if action.shortcut}
						<Menubar.Shortcut>⌘{action.shortcut}</Menubar.Shortcut>
					{/if}
				</Menubar.Item>
			{/each}
		</Menubar.Content>
	</Menubar.Menu>
{/snippet}

<Sidebar.Provider open={false}>
	<AppSidebar pdata={data} />
	<main class="flex h-screen w-screen flex-col overflow-hidden">
		<div class="flex gap-2 p-2">
			<Menubar.Root class="w-full">
				{#each store.menu as item}
					{@render menu({ data: item })}
				{/each}
			</Menubar.Root>
		</div>
		{@render children()}
	</main>
</Sidebar.Provider>
