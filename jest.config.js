export default {
	transform: {
		'^.+\\.svelte$': ['svelte-jester', { preprocess: true }],
		'^.+\\.js$': 'babel-jest',
		'^.+\\.ts$': 'babel-jest'
	},
	moduleFileExtensions: ['js', 'ts', 'svelte'],
	setupFilesAfterEnv: ['@testing-library/jest-dom'],
	// don't attempt to transform declaration files or internal type-only helpers
	transformIgnorePatterns: ['<rootDir>/src/types/'],
	testEnvironment: 'jsdom',
	// don't attempt to collect coverage from type declaration files
	coveragePathIgnorePatterns: ['<rootDir>/src/types/'],
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{js,ts,svelte}', '!src/app.html', '!**/node_modules/**'],
	coverageReporters: ['text', 'html'],
	testPathIgnorePatterns: ['/node_modules/', '/.svelte-kit/'],
	// Add module name mapping for SvelteKit aliases
	moduleNameMapper: {
		'^\\$lib/(.*)$': '<rootDir>/src/lib/$1',
		'^\\$app/(.*)$': '<rootDir>/src/app-mock/$1'
	}
};
