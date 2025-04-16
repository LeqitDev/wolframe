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
    <ul class="bg-base-200 mt-0! min-w-44">
        {@render children()}
    </ul>
</details>