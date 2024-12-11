<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/project-sidebar.svelte';

    let data = {
        project: {
            name: "Test Project",
        },
        project_path: '/root',
        files: [
            {
                path: '/root/main.typ',
                filename: 'main.typ',
            },
            {
                path: '/root/utils.typ',
                filename: 'utils.typ',
            },
            {
                path: '/root/README.md',
                filename: 'README.md',
            },
            {
                path: '/root/includes/pics/img.png',
                filename: 'img.png',
            },
            {
                path: '/root/includes/pics/img2.png',
                filename: 'img2.png',
            },
            {
                path: '/root/includes/data.json',
                filename: 'data.json',
            },
            {
                path: '/root/includes/templates/template1.typ',
                filename: 'template1.typ',
            },
            {
                path: '/root/includes/templates/template2.typ',
                filename: 'template2.typ',
            }
        ]
    }
</script>

<Sidebar.Provider open={false}>
	<AppSidebar pdata={data} activeFile="/root/main.typ" previewFile="/root/main.typ" />
</Sidebar.Provider>