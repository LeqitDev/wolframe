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
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: {
				alias: {
					$rust: path.resolve(__dirname, 'typst-flow-wasm/pkg')
				}
			},
	test: {
		environment: 'jsdom',
		setupFiles: ["./setup/idbSetup.ts"],
	},
	define: {
		global: {}
	},
	plugins: [sveltekit()]
});
