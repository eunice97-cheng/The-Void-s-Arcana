import { simulateFight, deterministicFight } from '../src/lib/utils/combatSimulator.js';
import { monsterBook } from '../src/lib/data/index.js';

// Simulate taking quest E101: defeat 5 x Goblin Grunts
const goblin = monsterBook.find((m) => m.id === 'goblin-grunt');
if (!goblin) {
	console.error('Goblin not found in monsterBook');
	process.exit(2);
}

// Player (using the same sample Warrior from earlier)
const playerTemplate = {
	name: 'Warrior',
	stats: {
		hp: 270,
		dps: 104.95,
		acc: 0.01875,
		eva: 0.01,
		phyDef: 51,
		magDef: 10,
		cr: 0.01,
		sp: 100,
		attackIntervalMs: 900
	},
	skills: ['acolyte_heal', 'mage_magic_barrier']
};

const seedBase = 54321;
let currentPlayer = JSON.parse(JSON.stringify(playerTemplate));
let currentHp = currentPlayer.stats.hp;

const allLogs = [];
let wins = 0;

console.log('Simulating quest E101: 5 x Goblin Grunt');
for (let i = 1; i <= 5; i++) {
	console.log(`\n--- Encounter ${i} (seed=${seedBase + i}) ---`);
	// create per-encounter attacker object using current HP and SP
	const attacker = JSON.parse(JSON.stringify(currentPlayer));
	attacker.stats.hp = currentHp;

	const sim = simulateFight(attacker, goblin, { seed: seedBase + i, maxRounds: 500 });

	// print full log for this encounter
	console.log(`Encounter ${i} logs (seed=${sim.seed}):`);
	sim.logs.forEach((entry) => console.log(JSON.stringify(entry)));

	// Update HP for next encounter
	currentHp = sim.final.attackerHp;
	if (currentHp > 0) {
		wins += 1;
		console.log(`Encounter ${i} result: Victory — remaining HP: ${currentHp}`);
	} else {
		console.log(`Encounter ${i} result: Defeated.`);
		break;
	}
}

console.log(`\nQuest result: ${wins} / 5 goblins defeated.`);
