/* eslint-env jest */
/* global require */
const { stringifyPreferEncrypted, parseMaybeEncrypted } = require('./encryption.cjs');

describe('encryption helpers', () => {
	test('encrypted round-trip', () => {
		const obj = {
			timestamp: Date.now(),
			playerData: { level: 1 },
			character: { name: 'Tester' },
			currentScene: 'Scene001'
		};
		const payload = stringifyPreferEncrypted(obj);
		const res = parseMaybeEncrypted(payload);
		expect(res).toBeDefined();
		expect(res.data).toBeDefined();
		expect(res.wasEncrypted).toBe(true);
		expect(res.data.playerData.level).toBe(1);
		expect(res.data.character.name).toBe('Tester');
	});

	test('plaintext auto-migrates when key provided', () => {
		// use parseMaybeEncrypted from CJS adapter
		const obj = {
			timestamp: Date.now(),
			playerData: { level: 2 },
			character: { name: 'Plain' },
			currentScene: 'Scene002'
		};
		const raw = JSON.stringify(obj);
		// ensure no key set
		localStorage.removeItem('test_migrate_key');
		// @ts-ignore - test intentionally passes a migrate key string
		const res = parseMaybeEncrypted(raw, 'test_migrate_key');
		expect(res.data.character.name).toBe('Plain');
		expect(res.wasEncrypted).toBe(false);
		const stored = localStorage.getItem('test_migrate_key');
		expect(stored).toBeTruthy();
		// stored should not equal raw
		expect(stored).not.toBe(raw);
	});
});
