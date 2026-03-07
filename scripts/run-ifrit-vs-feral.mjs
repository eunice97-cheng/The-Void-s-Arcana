import { simulateFight, deterministicFight } from '../src/lib/utils/combatSimulator.js';
import { monsterBook } from '../src/lib/data/index.js';

const wolf = monsterBook.find((m) => m.id === 'feral-wolf');
if (!wolf) {
  console.error('Feral Wolf not found');
  process.exit(2);
}

const attacker = {
  name: 'Ifrit Test',
  stats: {
    hp: 200,
    dps: 55,
    acc: 0.03,
    eva: 0.01,
    phyDef: 10,
    magDef: 5,
    cr: 0.05,
    sp: 100,
    attackIntervalMs: 1000
  },
  // include Ifrit and Magic Barrier to test both behaviors
  skills: [ 'mage_ifrit', 'mage_magic_barrier' ]
};

console.log('Deterministic summary: Ifrit Test -> Feral Wolf');
console.log(JSON.stringify(deterministicFight(attacker, wolf), null, 2));

console.log('\nSeeded stochastic simulation (seed=4242):');
const sim = simulateFight(attacker, wolf, { seed: 4242, maxRounds: 200 });
console.log('Final:', sim.final);
console.log('Logs:');
console.log(JSON.stringify(sim.logs, null, 2));

const hasIfritApplied = sim.logs.some(l => l.type === 'ATTACK_RESULT' && typeof l.raw === 'number' && l.raw > Math.round(attacker.stats.dps * 0.9));
console.log('\nIfrit-applied-suspected:', hasIfritApplied);
