import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import path from 'path';

export default defineConfig({
	server: {
		fs: {
			allow: [
				// search up for workspace root
				searchForWorkspaceRoot(process.cwd()),
				// your custom rules
				'typst-flow-wasm/pkg/*'
			]
		}
	},
	resolve: {
		alias: {
			"$rust": path.resolve(__dirname, 'typst-flow-wasm/pkg'),
		}
	},
	define: {
		global: {}
	},
	plugins: [sveltekit()]
});
