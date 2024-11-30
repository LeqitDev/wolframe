<script lang="ts">
	import { initializeLogger } from '$lib/logger.svelte';
	import '../app.css';

	initializeLogger();

	let { children } = $props();
</script>

<main class="flex h-screen w-screen flex-col">
	{@render children()}
</main>
