<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Separator from './ui/separator/separator.svelte';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
        <Avatar.Root>
            <Avatar.Image src="https://api.dicebear.com/9.x/bottts/svg?seed=cubecoder" alt="@cubecoder" />
            <Avatar.Fallback>CC</Avatar.Fallback>
        </Avatar.Root>
    </DropdownMenu.Trigger>
	<DropdownMenu.Content class="bg-background w-56" align="end">
		<DropdownMenu.Group>
            <DropdownMenu.Item>Profile</DropdownMenu.Item>
            <DropdownMenu.Item>Settings</DropdownMenu.Item>
        </DropdownMenu.Group>
            <DropdownMenu.Separator />
		<DropdownMenu.Group>
            <DropdownMenu.Item>Logout</DropdownMenu.Item>
        </DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
