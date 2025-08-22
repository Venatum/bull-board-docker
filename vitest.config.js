// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/tests/**/*.test.js'],
		coverage: {
			provider: 'v8',
			reportsDirectory: 'coverage',
			include: [
				'src/**/*.js'
			],
			exclude: [
				'src/views/**',
				'node_modules/**',
				'tests/**'
			],
			reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
			reportOnFailure: true,
		},
		reporters: ['verbose'],
		testTimeout: 5_000,

		// Useful additional options
		globals: true, // to use describe, it, expect without imports
		restoreMocks: true,
		mockReset: true,
		clearMocks: true,
	},
});
