#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const monstersPath = new URL('../src/lib/data/monsters.js', import.meta.url).pathname;

try {
	const { monsterBook } = await import(`file://${monstersPath}`);
	const errors = [];

	if (!Array.isArray(monsterBook)) {
		console.error('monsterBook is not an array');
		process.exit(2);
	}

	const requiredTopKeys = ['id', 'name', 'rank', 'area', 'element', 'type', 'description', 'stats'];
	const requiredStats = ['hp', 'dps', 'acc', 'eva', 'phyDef', 'magDef', 'cr'];

	monsterBook.forEach((m, idx) => {
		const prefix = `monsterBook[${idx}] (${m && m.id ? m.id : 'unknown'})`;
		requiredTopKeys.forEach((k) => {
			if (!(k in (m || {}))) errors.push(`${prefix}: missing key '${k}'`);
		});
		if (m && typeof m.stats !== 'object') {
			errors.push(`${prefix}: stats is not an object`);
		} else if (m && m.stats) {
			requiredStats.forEach((s) => {
				if (!(s in m.stats)) {
					errors.push(`${prefix}: stats missing '${s}'`);
				} else {
					const v = m.stats[s];
					if (typeof v !== 'number' || Number.isNaN(v))
						errors.push(`${prefix}: stats.${s} is not a number (${v})`);
				}
			});
		}
	});

	if (errors.length) {
		console.error('\nValidation failed:');
		errors.forEach((e) => console.error('- ' + e));
		process.exit(1);
	}

	console.log('Validation passed: all monster entries look good.');
	process.exit(0);
} catch (err) {
	console.error('Failed to validate monsters:', err);
	process.exit(2);
}
