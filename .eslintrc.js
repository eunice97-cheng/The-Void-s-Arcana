import globals from 'globals';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default [
	// Files and directories to ignore; this replaces the old .eslintignore
	{
		ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'static/**', 'tmp/**', 'build/**']
	},
	js.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	{
		files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'warn'
		}
	},
	{
		files: ['**/*.svelte'],
		...svelte.configs.recommended,
		rules: {
			'svelte/valid-compile': 'error',
			'svelte/no-unused-svelte-ignore': 'error',
			'svelte/require-store-callbacks-use-set-param': 'error',
			'svelte/require-store-reactive-access': 'error',
			'svelte/require-each-key': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn',
			// Reduce noise from unused vars in Svelte templates — prefer to address
			// these as code changes but treat as warnings while the repo is being cleaned up.
			// Disable base 'no-unused-vars' rules in svelte markup — we will
			// address unused variables in script sections individually.
			'no-unused-vars': 'off'
		}
	}
];
