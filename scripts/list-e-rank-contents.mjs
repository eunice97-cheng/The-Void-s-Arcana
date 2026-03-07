import fs from 'fs';
import path from 'path';
import { parseItemId } from '../src/lib/utils/items.js';

const items = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'src/lib/data/items.json'), 'utf8')
);

function isPhysicalWeapon(parsed) {
	const cat = parsed.category;
	return parsed.type === 1 && ((cat >= 11 && cat <= 15) || cat === 17);
}
function isMagicWeapon(parsed) {
	return parsed.type === 1 && parsed.category === 16;
}
function isHeavyArmor(parsed) {
	return parsed.type === 1 && parsed.category === 23;
}
function isMediumArmor(parsed) {
	return parsed.type === 1 && parsed.category === 22;
}
function isMagicArmor(parsed) {
	return parsed.type === 1 && parsed.category === 24;
}

const categories = {
	'e-rank-physical-weapon-1': isPhysicalWeapon,
	'e-rank-magic-weapon-1': isMagicWeapon,
	'e-rank-heavy-armor-1': isHeavyArmor,
	'e-rank-medium-armor-1': isMediumArmor,
	'e-rank-magic-armor-1': isMagicArmor
};

const results = {};
for (const token of Object.keys(categories)) {
	results[token] = [];
}

for (const idStr of Object.keys(items)) {
	try {
		const it = items[idStr];
		if (it.rank !== 'E') continue; // only E rank
		const parsed = parseItemId(String(it.id));
		for (const token of Object.keys(categories)) {
			const fn = categories[token];
			if (fn(parsed)) results[token].push({ id: it.id, name: it.name });
		}
	} catch {
		// ignore
	}
}

console.log(JSON.stringify(results, null, 2));
fs.writeFileSync(
	path.join(process.cwd(), 'tmp', 'e-rank-contents.json'),
	JSON.stringify(results, null, 2)
);
console.log('Wrote e-rank results to tmp/e-rank-contents.json');
