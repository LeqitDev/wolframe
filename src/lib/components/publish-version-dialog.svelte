<script lang="ts">
    import * as Dialog from '$lib/components/ui/dialog';
	import { type ProjectAppState, getPAS } from '$lib/stores/project.svelte';
	import { parse } from 'toml';
	import { Button } from './ui/button';
	import { AlertTriangle } from 'lucide-svelte';

    let {
        open = $bindable(false),
        newestVersion,
        handlePublish,
        projectState = $bindable(),
    }: {
        open: boolean;
        newestVersion: string | null;
        handlePublish: () => void;
        projectState: ProjectAppState;
    } = $props();

    function isNewVersion() {
        const version = getVersion().split('.');
        let isNew = true;
        if (newestVersion) {
            const newVersion = newestVersion.split('.');
            for (let i = 0; i < version.length; i++) {
                if (parseInt(version[i]) < parseInt(newVersion[i])) {
                    isNew = false;
                    break;
                }
            }
        }
        return isNew;
    }

    function getVersion() {
        if (!projectState.vfs.has('typst.toml')) {
            return '0.0.0';
        }
        let content = projectState.vfs.get('typst.toml')!.model.getValue();
        // console.log(content);
        
        const toml = parse(content);
        return toml.package.version;
    }
</script>

<Dialog.Root bind:open={open}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Publish Package Version {getVersion()}</Dialog.Title>
            <Dialog.Description>
                Make sure you have tested your changes and have the correct version number. Change the version number in the <code>typst.toml</code> file.
            </Dialog.Description>
        </Dialog.Header>
        <div class="py-4">
            <p class="font-semibold">
                Version to be published: <strong class="font-bold">{getVersion()}</strong>.
            </p>
            {#if !isNewVersion()}
                <div class="flex space-x-2 text-yellow-500 mt-2">
                    <AlertTriangle class="w-4" />
                    <p class="text-sm">You are about to publish a version that is already published. This will overwrite the existing version.</p>
                </div>
            {/if}
        </div>
        <Dialog.Footer>
            <Button variant="secondary" onclick={() => open = false}>Close</Button>
            <Button onclick={handlePublish}>
                {isNewVersion() ? 'Publish' : 'Overwrite and Publish'}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
