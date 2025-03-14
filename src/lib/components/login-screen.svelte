<script lang="ts">
	import { enhance } from "$app/forms";
	import type { ActionData } from "../../routes/$types";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Card from "$lib/components/ui/card";

    let { form }: { form: ActionData } = $props(); 
</script>
<Card.Root class="m-auto max-w-sm w-full bg-gradient-to-tr from-amber-800/50 to-fuchsia-700/50">
    <Card.Header>
        <Card.Title class="text-3xl text-white text-center" style="font-variant: small-caps;">Wolframe</Card.Title>
    </Card.Header>
    <Card.Content>
        <form method="post" action="?/login" use:enhance class="grid gap-4">
            <div class="grid gap-2">
                <Label for="username">Username</Label>
                <Input name="username" />
            </div>
            <div class="grid gap-2">
                <Label for="password">Password</Label>
                <Input type="password" name="password" />
            </div>
            <p style="color: red">{form?.message ?? ''}</p>
            <Button type="submit" class="w-full">Login</Button>
            <Button type="submit" size="sm" variant="ghost" class="w-full" formaction="?/register">Register</Button>
        </form>
    </Card.Content>
</Card.Root>