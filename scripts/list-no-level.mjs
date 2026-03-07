import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/lib/data/items.json');
const raw = fs.readFileSync(file, 'utf8');
const items = JSON.parse(raw);

const missing = [];
Object.values(items).forEach((item) => {
	if (item && (item.category === 'Weapon' || item.category === 'Armor')) {
		const levelReq = item.requirements && typeof item.requirements.level !== 'undefined';
		if (!levelReq) {
			missing.push({
				id: item.id,
				name: item.name,
				category: item.category,
				weaponClass: item.weaponClass,
				armorType: item.armorType
			});
		}
	}
});

console.log(JSON.stringify(missing, null, 2));
fs.writeFileSync(
	path.join(process.cwd(), 'tmp', 'no-level-items.json'),
	JSON.stringify(missing, null, 2)
);
console.log('Wrote', missing.length, 'items to tmp/no-level-items.json');
