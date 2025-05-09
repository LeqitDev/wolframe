<script lang="ts">
	import eventController from '@/lib/backend/events';
	import { getDebugStore } from '@/lib/backend/stores/debug.svelte';
	import { getUiStore } from '@/lib/backend/stores/ui.svelte';
	import { debug, debugLogStore } from '@/lib/backend/utils';
	import { createId } from '@paralleldrive/cuid2';
	import { ChevronRight } from 'lucide-svelte';
	import { untrack } from 'svelte';

	interface DebugError {
		id: string;
		severity: 'error' | 'warning' | 'info';
		message: string;
		details?: string;
		action?: {
			label: string;
			onClick: () => void;
		}
	}

	const uiStore = getUiStore();
	const debugStore = getDebugStore();

	let tab: 'output' | 'log' = $state('output');
	let filterType = $state('all');

	let errors: DebugError[] = $state([]);

	$effect(() => {
		untrack(() => (errors = []));
		if (debugStore.compileError) {
			console.log('Compile error:', $state.snapshot(debugStore.compileError));
			let err = debugStore.compileError;

			if ('CompileError' in err) {
				for (const error of err.CompileError) {
					untrack(() =>
						errors.push({
							id: createId(),
							severity:
								(error.severity as unknown) === 'Error'
									? 'error'
									: (error.severity as unknown) === 'Warning'
										? 'warning'
										: 'info',
							message: error.message,
							details: `on file ${error.range.path} at ${error.range.start}:${error.range.end}`,
							action: {
								label: 'view',
								onClick: () => {
									eventController.fire('command/file:open', error.range.path, () => {
										debug('info', 'debug', 'hi');
									});
								}
							}
						})
					);
				}
			} else if ('DefaultError' in err) {
				untrack(() =>
					errors.push({
						id: createId(),
						severity: 'error',
						message: err.DefaultError
					})
				);
			}
		}
	});

	const scrollToBottom = (node: HTMLElement, list: any) => {
		const scroll = () =>
			node.scroll({
				top: node.scrollHeight
				// behavior: 'smooth',
			});
		scroll();

		return {
			update: (list: any) => {
				if (list.length > 0) {
					scroll();
				}
			}
		};
	};
</script>

{#if uiStore.isDebugPanelMinimized}
	<button
		class="flex w-full items-center gap-2 px-2"
		onclick={() => uiStore.setDebugPanelSize?.(100 - 30)}
	>
		<p class="text-sm text-gray-400">
			Compile Errors: <span class="text-error/80 p-0.5 font-bold">{errors.length}</span>
		</p>
	</button>
{:else}
	<div class="flex h-full w-full flex-col gap-2 px-2 pt-2">
		<div class="flex max-h-10 min-h-10 w-full items-center justify-between">
			<div class="flex gap-4">
				<button
					class={[
						tab === 'output' ? 'underline decoration-2 underline-offset-8' : 'text-gray-400',
						'cursor-pointer'
					]}
					onclick={() => (tab = 'output')}>Compile output</button
				>
				<button
					class={[
						tab === 'log' ? 'underline decoration-2 underline-offset-8' : 'text-gray-400',
						'cursor-pointer'
					]}
					onclick={() => (tab = 'log')}>Logs</button
				>
			</div>
			{#if tab === 'output'}
				<div class="flex gap-2" role="radiogroup">
					<input
						class="btn btn-sm btn-accent not-checked:btn-soft"
						type="radio"
						bind:group={filterType}
						value="all"
						aria-label="All"
					/>
					<input
						class="btn btn-sm btn-warning not-checked:btn-soft"
						type="radio"
						bind:group={filterType}
						value="warning"
						aria-label="Warnings"
					/>
					<input
						class="btn btn-sm btn-error not-checked:btn-soft"
						type="radio"
						bind:group={filterType}
						value="error"
						aria-label="Errors"
					/>
				</div>
			{/if}
		</div>
		{#if tab === 'output'}
			<div
				class="bg-base-300 flex h-full w-full flex-col gap-2 overflow-y-auto rounded-t px-1 pt-1"
			>
				{#each errors.filter((value) => filterType === 'all' || value.severity === filterType) as error (error.id)}
					{@const colorTrailer =
						error.severity === 'error'
							? '-error'
							: error.severity === 'warning'
								? '-warning'
								: '-info'}
					{#if error.details}
						<details class="group collapse">
							<summary class="collapse-title min-h-8 p-2 hover:brightness-90">
								<div class="flex items-center gap-2">
									<ChevronRight
										class="h-4 w-4 transition-transform duration-200 group-open:rotate-90 {'text' +
											colorTrailer}"
									/>
									<p class="font-mono">{error.message}{#if error.action} <span><button class="link btn-xs text-gray-400 text-sm" onclick={error.action.onClick}>({error.action.label})</button></span>{/if}</p>
								</div>
							</summary>
							<div class="collapse-content relative px-2 pb-2 text-sm">
								<div
									class="absolute top-0 left-4 h-full w-0.5 {'bg' +
										colorTrailer} -translate-x-1/2 -translate-y-2 transform"
								></div>
								<div class="absolute bottom-2 left-4 h-0.5 w-2 {'bg' + colorTrailer}"></div>
								<p class="pl-5 font-mono text-gray-400">{error.details}</p>
							</div>
						</details>
					{:else}
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full {'bg' + colorTrailer}"></div>
							<p class="font-mono">{error.message}</p>
						</div>
					{/if}
				{/each}
			</div>
		{:else if tab === 'log'}
			<div
				class="bg-base-300 mb-12 min-h-0 w-full grow overflow-y-auto rounded-t px-1 pt-1"
				use:scrollToBottom={$debugLogStore}
			>
				{#each $debugLogStore as log (log.id)}
					{@const colorTrailer =
						log.type === 'error'
							? '-error'
							: log.type === 'warning'
								? '-warning'
								: log.type === 'info'
									? '-info'
									: '-gray-400'}
					<div class="flex items-center gap-2 text-xs {'text' + colorTrailer} not-last:pb-1">
						<p class="font-mono">
							<span class="pr-4">{`[${log.timestamp}${log.domain ? ` - ${log.domain}` : ""}]`}</span>{log.message}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
