
import { simulateFight } from './combatSimulator.browser.js';

describe('combatSimulator Undead', () => {
    test('should offensive heal against Undead', () => {
        const attacker = {
            name: 'Player',
            stats: {
                hp: 100,
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
            name: 'Skeleton',
            type: 'Undead',
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

        const result = simulateFight(attacker, defender, { maxRounds: 5 });

        // Check logs for SKILL_CAST
        const healLog = result.logs.find(l => l.type === 'SKILL_CAST' && l.skill === 'acolyte_heal');

        // Expect heal to be cast offensively
        expect(healLog).toBeDefined();
        if (healLog) {
            expect(healLog.detail.used).toBe(true);
            expect(healLog.detail.type).toBe('offensive');
            expect(healLog.detail.damage).toBeGreaterThan(0);
        }
    });
});
