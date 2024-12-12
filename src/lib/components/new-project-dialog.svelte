<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { newProjectSchema, type NewProjectSchema } from '$lib/forms/schema';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from './ui/input';
	import { Switch } from './ui/switch';
	import { type Snippet } from 'svelte';

	let {
		data,
		isPackage,
		user,
		children
	}: {
		data: SuperValidated<Infer<NewProjectSchema>>;
		isPackage: boolean;
		user: {
			id: string;
			username: string;
		};
		children: any;
	} = $props();

	const form = superForm(data, {
		validators: zodClient(newProjectSchema)
	});


	const { form: formData, enhance } = form;

	let visibilityDescription = $derived.by(
		() => {
			if ($formData.isPublic) {
				return 'This is the visibility of the project. Currently, it is set to public. Anyone can access the package.';
			} else {
				return 'This is the visibility of the project. Currently, it is set to private. Only you and members of a team you are part of can access the package.';
			}
		}
	)
</script>

<Dialog.Root>
	<Dialog.Trigger class="w-full">{@render children()}</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create a new {isPackage ? 'Package' : 'Document'}</Dialog.Title>
			<Dialog.Description>Provide some details to create a new project.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/new_project" id="create" class="space-y-8 py-4" use:enhance>
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Name</Form.Label>
						<Input {...props} bind:value={$formData.name} />
					{/snippet}
				</Form.Control>
				<Form.Description>This is the display name of the project.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="description">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Description</Form.Label>
						<Input {...props} bind:value={$formData.description} />
					{/snippet}
				</Form.Control>
				<Form.Description>This is the description of the project.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="isPublic" hidden={!isPackage}>
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center space-x-2">
							<Switch {...props} bind:checked={$formData.isPublic} />
							<Form.Label>Public</Form.Label>
						</div>
					{/snippet}
				</Form.Control>
				<Form.Description>{visibilityDescription}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="isPackage" hidden>
				<Form.Control>
					{#snippet children({ props })}
						<Input {...props} value={isPackage} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="ownerId" hidden>
				<Form.Control>
					{#snippet children({ props })}
						<Input {...props} value={user.id} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</form>
		<Dialog.Footer>
			<Button form="create" type="submit">Create</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
