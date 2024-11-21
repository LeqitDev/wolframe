<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { newProjectSchema, type NewProjectSchema } from '$lib/forms/schema';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from './ui/input';
	import { Switch } from './ui/switch';

	let {
		data,
		user
	}: {
		data: SuperValidated<Infer<NewProjectSchema>>;
		user: {
			id: string;
			username: string;
		};
	} = $props();

	const form = superForm(data, {
		validators: zodClient(newProjectSchema)
	});

	const { form: formData, enhance } = form;
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Create New Project</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create a new Project</Dialog.Title>
			<Dialog.Description>Provide some detials to create a new project.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/new_project" id="create" use:enhance>
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
			<Form.Field {form} name="isPublic">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Visibility</Form.Label>
						<Switch {...props} bind:checked={$formData.isPublic} />
					{/snippet}
				</Form.Control>
				<Form.Description>This is the visibility of the project.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="ownerId">
				<Form.Control>
					{#snippet children({ props })}
						<Input {...props} value={user.id} class="hidden" />
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
