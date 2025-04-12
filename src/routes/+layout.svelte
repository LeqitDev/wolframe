<script lang="ts">
	import { FlashMessage, setFlashManager } from '$lib/backend/stores/flash.svelte';
	import { untrack } from 'svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';
	import FlashCard from '$lib/frontend/components/FlashCard.svelte';
	import { createId } from '@paralleldrive/cuid2';

	let { data, children }: LayoutProps = $props();

	const flashManager = setFlashManager();
	const flashes: FlashMessage[] = $state([]);

	$effect(() => {
		console.log("Layout here :)", flashManager.hasMessages);
		if (flashManager.hasMessages) {
			flashes.push(flashManager.getMessage()!);
		}
	})
</script>

{@render children()}

<div class="toast toast-bottom toast-center flex-col-reverse">
	<!-- <div class="not-hover:stack hover:flex hover:flex-col hover:gap-2 transition-all duration-300 ease-in-out"> -->
		{#each flashes as flash (flash.id)}
			<FlashCard {flash} remove={() => {
				flashes.splice(flashes.indexOf(flash), 1);
			}} />
		{/each}
	<!-- </div> -->
</div>