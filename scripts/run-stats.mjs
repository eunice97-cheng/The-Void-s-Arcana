import { getBaseStats, calculateDerived } from '../src/lib/utils/stats.js';

function run() {
	const stats = getBaseStats();

	console.log('base stats:', stats);

	const classes = ['warrior', 'rogue', 'archer', 'mage', 'acolyte', 'tinkerer'];
	for (const c of classes) {
		const d = calculateDerived(stats, c);
		console.log(`${c}: maxHp=${d.maxHp}, maxSp=${d.maxSp}, maxStamina=${d.maxStamina}`);
	}
}

run();
