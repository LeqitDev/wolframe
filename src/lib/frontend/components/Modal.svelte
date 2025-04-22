<script lang="ts">
	let {
		open = $bindable(false),
		clickOutsideClose = $bindable(false),
		title = $bindable('Modal Title'),
		content = $bindable(
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque fringilla, nunc a facilisis tincidunt, nisi nunc aliquet nunc, eget aliquam nunc nunc eget nunc.'
		),
		actionButtons = $bindable([
			{ label: 'Close', action: () => {}, close: true },
			{ label: 'Save', action: () => {}, close: true, primary: true }
		]),
		onclose = $bindable(() => {})
	}: {
		open?: boolean;
		clickOutsideClose?: boolean;
		title?: string;
		content?: string;
		actionButtons?: Array<{ label: string; action: () => void; close: boolean; primary?: boolean }>;
		onclose?: () => void;
	} = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	});
</script>

<dialog
	class="modal"
	onclose={() => {
		open = false;
		onclose();
	}}
	bind:this={dialog}
>
	<div class="modal-box w-sm">
		<h2 class="text-xl font-bold">{title}</h2>
		<p class="pt-4">{content}</p>
		{#if actionButtons.length > 0}
			<div class="modal-action pt-4">
				{#each actionButtons as button}
					<button
						class={['btn', button.primary ? 'btn-primary' : '']}
						onclick={() => {
							button.action();
							if (button.close) open = false;
						}}
					>
						{button.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	{#if clickOutsideClose}
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	{/if}
</dialog>
