<script lang="ts">
	import NavBar from '$lib/frontend/components/NavBar.svelte';

    let { children } = $props();
</script>

<NavBar />

{@render children()}