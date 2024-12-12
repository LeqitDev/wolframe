<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Separator from './ui/separator/separator.svelte';

    async function logoutAction() {
        const logout = await fetch('/?/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        if (logout.ok) {
            window.location.href = '/';
        }
    }
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
        <Avatar.Root>
            <Avatar.Image src="https://api.dicebear.com/9.x/shapes/svg?seed=cubecoder" alt="@cubecoder" />
            <Avatar.Fallback>UN</Avatar.Fallback>
        </Avatar.Root>
    </DropdownMenu.Trigger>
	<DropdownMenu.Content class="bg-background w-56" align="end">
		<DropdownMenu.Group>
            <DropdownMenu.Item>Profile</DropdownMenu.Item>
            <DropdownMenu.Item>Settings</DropdownMenu.Item>
        </DropdownMenu.Group>
            <DropdownMenu.Separator />
		<DropdownMenu.Group>
            <DropdownMenu.Item onclick={logoutAction}>Logout</DropdownMenu.Item>
        </DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
