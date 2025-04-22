<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { FlashMessage, getFlashManager } from '@/lib/frontend/stores/Flash.svelte';
	import { untrack } from 'svelte';

	const flashManager = getFlashManager();

	$effect(() =>
		untrack(() => {
			flashManager.add(new FlashMessage('error', 'Login failed. Please try again.', null));
			goto('/auth', { replaceState: true });
		})
	);
</script>
