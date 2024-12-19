<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/project-sidebar.svelte';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import type { PageData } from './$types';
	import { createLayoutStore } from '$lib/stores/layoutStore.svelte';

	let { children, data }: { children: any; data: PageData } = $props();

	const store = createLayoutStore();
</script>

<Sidebar.Provider open={false}>
	<AppSidebar {...store.sidebarActions} pdata={data} debug bind:previewFile={store.sidebarPreview} bind:activeFile={store.sidebarActive} />
	<main class="flex h-screen w-screen flex-col overflow-hidden">
		<div class="flex gap-2 p-2">
			{#if store.menubarSnippet}
				{@render store.menubarSnippet()}
			{/if}
		</div>
		{@render children()}
	</main>
</Sidebar.Provider>
