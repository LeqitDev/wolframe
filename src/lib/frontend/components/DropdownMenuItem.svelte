<script lang="ts">
    let detailsElement: HTMLDetailsElement;

    let {
        name,
        children
    } = $props();
</script>

<svelte:window onclick={() => {
    if (detailsElement) {
        detailsElement.open = false;
    }
}} />

<details bind:this={detailsElement}>
    <summary class="after:hidden py-1">{name}</summary>
    <ul class="bg-base-100 mt-0! min-w-44 z-20 border border-base-300">
        {@render children()}
    </ul>
</details>