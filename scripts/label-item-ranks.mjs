import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/lib/data/items.json');
const raw = fs.readFileSync(file, 'utf8');
const items = JSON.parse(raw);

let updated = 0;
for (const [id, item] of Object.entries(items)) {
	try {
		const parsedId = String(id).padStart(7, '0');
		if (!parsedId.startsWith('1')) continue; // only equipable
		// const categoryType = parsedId.slice(1, 3); // not used within this script
		// Only add rank on Weapon/Armor
		if (item.category === 'Weapon' || item.category === 'Armor') {
			const level =
				item.requirements && item.requirements.level ? Number(item.requirements.level) : null;
			let rank = 'E';
			if (level === null || level === undefined) {
				// default E
				rank = 'E';
			} else if (level <= 10) {
				rank = 'E';
			} else if (level <= 20) {
				rank = 'D';
			} else {
				// The user said currently there are no C+ in the data. Default to D as per instruction
				rank = 'D';
			}
			if (item.rank !== rank) {
				item.rank = rank;
				updated++;
			}
		}
	} catch (e) {
		console.error('Failed to parse item', id, e?.message);
	}
}

fs.writeFileSync(file, JSON.stringify(items, null, 4));
console.log('Updated ranks for', updated, 'items');
