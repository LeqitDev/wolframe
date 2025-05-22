<script lang="ts">
	import type { Grammar } from "@/app.types";
    import monacoController from "@/lib/backend/monaco";
	import { convertTheme, type IVScodeTheme } from "@/lib/backend/monaco/textmate/theme-converter";
    import ColorPicker from 'svelte-awesome-color-picker';

    const grammars: {[key: string]: string} = {
        'typst': 'https://raw.githubusercontent.com/wolframe-project/tinymist-textmate/refs/heads/main/typst.tmLanguage.json',
    }

    let curGrammar: keyof typeof grammars = $state('typst');
    let curTheme: IVScodeTheme = $state({
        $schema: 'vscode://schemas/color-theme',
        type: 'dark',
        tokenColors: [],
        colors: {},
        name: '',
        include: ''
    });
    let curView: "none" | "details" | "tokens" | "token" = $state('details');

    let {
        window: newWindow
    } = $props();

    const views = {
        "none": theme_none,
        "details": theme_details,
        "tokens": theme_tokens,
        "token": theme_token,
    }

    const MonacoBaseColors = [
        'editor.background',
	    'editor.foreground',
        'menu.background',
	    'editor.lineHighlightBackground',
	    'editor.selectionBackground',
	    'editorCursor.foreground',
    ]

    const DB_NAME = 'themeEditorDB';
    const STORE_NAME = 'themes';
    const THEME_KEY = 'currentTheme';

    let db: IDBDatabase | null = null;

    async function initDB() {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject("Error opening DB");
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const dbInstance = (event.target as IDBOpenDBRequest).result;
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    dbInstance.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async function saveThemeToDB(theme: IVScodeTheme) {
        if (!db) {
            await initDB();
        }
        if (db) {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(theme, THEME_KEY);
            return new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject("Error saving theme");
            });
        }
    }

    async function loadThemeFromDB() {
        if (!db) {
            await initDB();
        }
        if (db) {
            return new Promise<IVScodeTheme | undefined>((resolve, reject) => {
                const transaction = db!.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(THEME_KEY);
                request.onerror = () => reject("Error loading theme");
                request.onsuccess = () => {
                    if (request.result) {
                        curTheme = request.result;
                    }
                    resolve(request.result);
                };
            });
        }
        return undefined;
    }

    $effect(() => {
        // Initialize DB and load theme when component mounts
        loadThemeFromDB();
        return () => {
            console.log('cleanup');
            // Cleanup: close the DB connection when the component is destroyed
            if (db) {
                db.close();
            }
        }
    });

    $effect(() => {
        // Save theme whenever curTheme changes (after the initial load)
        const themeToSave = $state.snapshot(curTheme);
        // Avoid saving the default empty theme immediately on load if not intended
        if (themeToSave.name || themeToSave.tokenColors.length > 0) {
            saveThemeToDB(themeToSave).catch(console.error);
        }
    });

    function overrideTheme() {
        monacoController.changeTheme(convertTheme($state.snapshot(curTheme)), 'test-theme');
    }

    function lastView() {
        if (curView == 'token') {
            curView = 'tokens';
        } else {
            curView = 'none';
        }
    }

    async function loadGrammar() {
        const grammar = await fetch(grammars[curGrammar]);
        const grammarText = await grammar.json();
        return grammarText as Grammar;
    }
</script>

{#snippet theme_actions()}
<button class="btn btn-primary" onclick={overrideTheme}>
    Override Theme
</button>
{/snippet}

{#snippet theme_none()}
    <div class="grid grid-cols-2 gap-2 justify-center">
        <button class="btn btn-primary w-sm" onclick={() => { curView = 'details'; }}>Details</button>
        <button class="btn btn-primary w-sm" onclick={() => { curView = 'tokens'; }}>Tokens</button>
    </div>
{/snippet}

{#snippet theme_details()}
    <div class="grid grid-cols-2 gap-2" style="margin-bottom: 2rem;">
        <div class="flex flex-col gap-2">
            <label for="themeName">Theme Name</label>
            <input type="text" id="themeName" class="input" bind:value={curTheme.name} />
        </div>
        <div class="flex flex-col gap-2">
            <label for="themeType">Theme Type</label>
            <select id="themeType" class="select" bind:value={curTheme.type}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="hcDark">High Contrast Dark</option>
                <option value="hcLight">High Contrast Light</option>
            </select>
        </div>
    </div>
    <p class="text-2xl" style="margin-bottom: 1rem;">Base Colors</p>
    <div class="grid grid-cols-2 gap-2" style="--cp-bg-color: #333; --cp-input-color: #555;--cp-button-hover-color: #777;">
        {#each MonacoBaseColors as color}
            <div class="flex flex-col gap-2">
                <label for={color}>{color}</label>
                <ColorPicker hex={curTheme.colors![color]} name={color}/>
            </div>
        {/each}
    </div>
{/snippet}

{#snippet theme_tokens()}
    <div></div>
{/snippet}

{#snippet theme_token()}
    <div></div>
{/snippet}

<svelte:window onmousedown={(e) => {console.log(e);}} />

<div class="flex flex-col gap-2 max-h-screen w-screen">
    {#await loadGrammar()}
        <p>Loading grammar</p>
    {:then g}
        <div class="flex justify-between">
            <div class="flex gap-2">
                {#if curView != "none"}<button class="btn btn-primary" onclick={lastView}>Back</button>{/if}
                <p>Grammar {g.name}</p>
            </div>
            <div>
                {@render theme_actions()}
            </div>
        </div>
        <div class="p-2">
            {@render views[curView]()}
        </div>
    {/await}
</div>
