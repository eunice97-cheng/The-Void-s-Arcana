// import the module using ESM syntax
import * as statsModule from './stats.js';

describe('stats util', () => {
	test('base stats are all 5', () => {
		const s = statsModule.getBaseStats();
		expect(s.STR).toBe(5);
		expect(s.DEX).toBe(5);
		expect(s.INT).toBe(5);
		expect(s.CON).toBe(5);
		expect(s.WIS).toBe(5);
		expect(s.CHA).toBe(5);
	});

	test('warrior derived HP and SP calculation', () => {
		const s = statsModule.getBaseStats();
		const d = statsModule.calculateDerived(s, 'warrior');
		// Base 100 + warrior startHp 50 + CON(5)*24 = 100 + 50 + 120 = 270
		expect(d.maxHp).toBe(270);
		// Base SP 100 + startSp 0 + WIS(5)*16 = 100 + 80 = 180
		expect(d.maxSp).toBe(180);
		expect(d.maxStamina).toBe(100);
	});

	test('rogue derived values', () => {
		const s = statsModule.getBaseStats();
		const d = statsModule.calculateDerived(s, 'rogue');
		// 100 + 25 + CON(5)*20 = 100 + 25 + 100 = 225
		expect(d.maxHp).toBe(225);
		// 100 + 25 + WIS(5)*20 = 100 + 25 + 100 = 225
		expect(d.maxSp).toBe(225);
	});
});
