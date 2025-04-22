<script lang="ts">
	import type { PageProps } from './$types';
    import { getFlashManager } from "@/lib/frontend/stores/Flash.svelte";
	import { createId } from '@paralleldrive/cuid2';

    const flashManager = getFlashManager();
	let i = 0;

	let { data }: PageProps = $props();
</script>

<button onclick={() => {
		flashManager.add({
			message: "This is a success message" + i++,
			duration: null,
			type: "error",
			id: createId(),
		});
	}}>
	Add Flash
</button>