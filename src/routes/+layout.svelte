<script lang="ts">
	import { FlashMessage, setFlashManager } from '@/lib/frontend/stores/Flash.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';
	import FlashCard from '$lib/frontend/components/FlashCard.svelte';
	import { setModalManager } from '@/lib/frontend/stores/Modal.svelte';
	import Modal from '@/lib/frontend/components/Modal.svelte';
	import eventController from '@/lib/backend/events';
	import monacoController from '@/lib/backend/monaco';
	import { TypstTheme } from '@/lib/backend/monaco/typst/theme';

	let { data, children }: LayoutProps = $props();

	const flashManager = setFlashManager();
	const flashes: FlashMessage[] = $state([]);

	const modalManager = setModalManager();

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

{#if modalManager.hasModal}
	{@const modal = modalManager.modal!}
	<Modal open={true} bind:title={modal.title} bind:content={modal.content} bind:actionButtons={modal.actions} bind:clickOutsideClose={modal.closeOnOutsideClick} onclose={() => {
		modalManager.clear();
	}} />
{/if}