<script lang="ts"> // TODO: [] inside string is picked up by the highlighter and fucks it up
	import init, * as typst from '$rust/typst_flow_wasm';
	// import { init, Wasmer } from "@wasmer/sdk";

	let compiler: typst.SuiteCore;

	let editor: any = null;
	let divEl: HTMLDivElement;
	let model: any = null;

	function xml_get_sync(path: string) {
		const request = new XMLHttpRequest();
		request.overrideMimeType('text/plain; charset=x-user-defined');
		request.open('GET', path, false);
		request.send(null);

		if (
		request.status === 200 &&
		(request.response instanceof String || typeof request.response === 'string')
		) {
		return Uint8Array.from(request.response, (c: string) => c.charCodeAt(0));
		}
		return Uint8Array.from([]);
	}


	$effect(() => {
		(window as any).xml_get_sync = xml_get_sync;
		init().then(() => {
			compiler = new typst.SuiteCore('');
			try {
				compiler.add_file('main.typ', '');
			} catch (e) {
				console.error(e);
			}

			

			/* import('$lib/editor').then(({ EditorSetup, initializeEditor, createModel }) => {
				initializeEditor(compiler).then((_editor) => {
					console.log('Editor initialized');
					editor = _editor;

					// Provide models for the vfs
					model = createModel('');

					// Set the first model
					editor.setModel(model);

					editor.addAction({
						id: "testing-import-analysis",
						label: "Import Analysis",
						precondition: null,
						keybindingContext: null,
						contextMenuGroupId: 'navigation',
						contextMenuOrder: 1.5,
						run: (ed) => {
							console.log('Running import analysis');
							compiler.imports();
						}
					})

					// Add the listeners
					editor.onDidChangeModelContent((e) => {
						for (let change of e.changes) {
							try {
								console.log('Change:', change);
								compiler.edit('main.typ', change.text, change.rangeOffset, change.rangeOffset + change.rangeLength);
							} catch (e) {
								console.error(e);
							}
						}
					});
				});
			}); */
		});

		return () => {
			// Cleanup
			editor?.dispose();
		};
	});
</script>

<div bind:this={divEl} id="editor" class="h-full w-full"></div>
