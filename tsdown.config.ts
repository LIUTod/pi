import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: 'esm',
	dts: false,
	clean: true,
	external: [
		'node:fs',
		'node:os',
		'node:path',
		'node:perf_hooks',
		'node:child_process',
		'get-east-asian-width',
		'marked',
	],
});
