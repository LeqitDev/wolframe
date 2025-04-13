<script lang="ts">
	import NavBar from '$lib/frontend/components/NavBar.svelte';

    let { data, children } = $props();
</script>

<NavBar />

{@render children()}