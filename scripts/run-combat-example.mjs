import { deterministicFight, simulateFight } from '../src/lib/utils/combatSimulator.js';
import { monsterBook } from '../src/lib/data/index.js';

// Example: Warrior vs Goblin-Grunt (E101)
const warrior = {
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

const goblin = monsterBook.find((m) => m.id === 'goblin-grunt');
if (!goblin) {
	console.error('Goblin not found in monsterBook');
	process.exit(2);
}

console.log('Deterministic summary: Warrior -> Goblin');
const det = deterministicFight(warrior, goblin);
console.log(JSON.stringify(det, null, 2));

console.log('\nSeeded stochastic simulation (seed=12345):');
const sim = simulateFight(warrior, goblin, { seed: 12345, maxRounds: 100 });
console.log('Final:', sim.final);
console.log('Log sample (first 12 entries):');
console.log(JSON.stringify(sim.logs.slice(0, 12), null, 2));

// print short summary
const winner =
	sim.final.defenderHp <= 0 && sim.final.attackerHp > 0
		? 'Warrior'
		: sim.final.attackerHp <= 0 && sim.final.defenderHp > 0
			? 'Goblin'
			: 'Draw';
console.log('\nWinner:', winner);
