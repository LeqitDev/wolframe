<script lang="ts">
    let {
        open = $bindable(),
        clickOutsideClose = false
    }: {
        open: boolean;
        clickOutsideClose?: boolean;
    } = $props();

    let dialog: HTMLDialogElement;

    $effect(() => {
        if (open) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    })
</script>

<dialog class="modal" onclose={() => open = false} bind:this={dialog}>
    <div class="modal-box w-sm">
        <h2 class="text-xl font-bold">Modal Titel</h2>
        <p class="py-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque fringilla, nunc a facilisis
            tincidunt, nisi nunc aliquet nunc, eget aliquam nunc nunc eget nunc.</p>
        <div class="modal-action">
            <button class="btn" onclick={() => open = false}>Close</button>
            <button class="btn btn-primary" onclick={() => open = false}>Save</button>
        </div>
    </div>
    {#if clickOutsideClose}
    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
    {/if}
</dialog>