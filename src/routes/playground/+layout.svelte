<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/project-sidebar.svelte';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import type { PageData } from './$types';
	import { initializeController, type Controller } from '$lib/stores/controller.svelte';
	import { PlaygroundFileHandler } from '$lib/utils/playground';

	let { children, data }: { children: any; data: PageData } = $props();

	const store: Controller = initializeController(new PlaygroundFileHandler());
	let storeLoaded = $state(false);

	$effect(()=> {
		store.init();
		storeLoaded = true;
	});
</script>

<Sidebar.Provider open={false}>
	<AppSidebar />
	<main class="flex h-screen w-screen flex-col overflow-hidden">
		<div class="flex gap-2 p-2">
			{#if storeLoaded}
				{#if store.menuSnippet}
					{@render store.menuSnippet()}
				{/if}
			{/if}
		</div>
		{@render children()}
	</main>
</Sidebar.Provider>
