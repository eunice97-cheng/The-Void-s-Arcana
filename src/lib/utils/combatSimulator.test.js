
import { simulateFight } from './combatSimulator.browser.js';

describe('combatSimulator', () => {
    test('should auto-cast acolyte_heal when HP is low', () => {
        const attacker = {
            name: 'Player',
            stats: {
                hp: 100, // Low Max HP
                maxHp: 100,
                sp: 100,
                dps: 10,
                acc: 100,
                eva: 0,
                phyDef: 0,
                magDef: 0,
                cr: 0,
                attackIntervalMs: 1000
            },
            skills: ['acolyte_heal'],
            skillCooldowns: {},
            activeBuffs: {}
        };

        const defender = {
            name: 'Monster',
            stats: {
                hp: 1000,
                sp: 0,
                dps: 10,
                acc: 100,
                eva: 0,
                phyDef: 0,
                magDef: 0,
                cr: 0,
                attackIntervalMs: 1000
            },
            skills: [],
            skillCooldowns: {},
            activeBuffs: {}
        };

        // Set attacker HP to be low initially (10/100)
        attacker.stats.hp = 10;

        const result = simulateFight(attacker, defender, { maxRounds: 5 });

        // Check logs for SKILL_CAST
        const healLog = result.logs.find(l => l.type === 'SKILL_CAST' && l.skill === 'acolyte_heal');

        // Expect heal to be cast
        expect(healLog).toBeDefined();
        if (healLog) {
            expect(healLog.detail.used).toBe(true);
        }
    });
});
