// scripts/compute-derived-stats-lv3-summary.cjs
// Compute best combos at level 3 and print concise summary per class
const fs = require('fs');
const items = JSON.parse(fs.readFileSync('src/lib/data/items.json', 'utf8'));

const classes = [
	{ id: 'warrior', prim: 'STR' },
	{ id: 'rogue', prim: 'DEX' },
	{ id: 'archer', prim: 'DEX' },
	{ id: 'mage', prim: 'INT' },
	{ id: 'acolyte', prim: 'WIS' },
	{ id: 'tinkerer', prim: 'INT' }
];

const CLASS_BONUSES = {
	warrior: { startHp: 50, startSp: 0 },
	rogue: { startHp: 25, startSp: 25 },
	archer: { startHp: 25, startSp: 25 },
	mage: { startHp: 0, startSp: 50 },
	acolyte: { startHp: 0, startSp: 50 },
	tinkerer: { startHp: 0, startSp: 50 }
};

const STAT_MULTIPLIERS = {
	CON: {
		warrior: { hp: 24 },
		archer: { hp: 20 },
		rogue: { hp: 20 },
		mage: { hp: 16 },
		acolyte: { hp: 16 },
		tinkerer: { hp: 16 }
	},
	WIS: {
		warrior: { sp: 16 },
		archer: { sp: 20 },
		rogue: { sp: 20 },
		mage: { sp: 24 },
		acolyte: { sp: 24 },
		tinkerer: { sp: 24 }
	},
	STR: {
		warrior: { pAtk: 5, pDef: 3 },
		archer: { pAtk: 1, pDef: 2 },
		rogue: { pAtk: 3, pDef: 2 },
		mage: { pAtk: 1, pDef: 1 },
		acolyte: { pAtk: 1, pDef: 1 },
		tinkerer: { pAtk: 1, pDef: 1 }
	},
	DEX: {
		warrior: { acc: 0.003, eva: 0.002, cr: 0.002 },
		archer: { acc: 0.0035, eva: 0.002, cr: 0.0025 },
		rogue: { acc: 0.003, eva: 0.0025, cr: 0.005 },
		mage: { acc: 0.003, eva: 0.002, cr: 0.002 },
		acolyte: { acc: 0.003, eva: 0.002, cr: 0.002 },
		tinkerer: { acc: 0.003, eva: 0.002, cr: 0.002 }
	},
	INT: { mage: { mAtk: 5, mRes: 3 }, acolyte: { mAtk: 5, mRes: 3 }, tinkerer: { mAtk: 5, mRes: 3 } }
};

const EQUIPMENT_BONUSES = {
	TWO_HAND_BONUS: { pAtk: 0.15 },
	DUAL_WIELD: { atkSpd: 0.1 },
	SWORD_N_BOARD: { pDef: 0.1 }
};

function meetsReq(item, cls, stats, level) {
	if (!item.requirements) return true;
	if (item.requirements.level && item.requirements.level > level) return false;
	if (item.requirements.class) {
		const req = item.requirements.class;
		if (Array.isArray(req)) {
			if (!req.map((r) => r.toLowerCase()).includes(cls.toLowerCase())) return false;
		} else if (typeof req === 'string') {
			if (req.toLowerCase() !== cls.toLowerCase()) return false;
		}
	}
	if (item.requirements && item.requirements.stats) {
		for (const k of Object.keys(item.requirements.stats)) {
			if ((stats[k] || 0) < item.requirements.stats[k]) return false;
		}
	}
	return true;
}
function isTwoHanded(it) {
	return it && it.weaponType && it.weaponType.includes('Two-Handed');
}

// Build armor pools by slot (include all armor/accessories)
const armorItems = Object.values(items).filter((it) =>
	['Armor', 'Accessory', 'Trinket', 'Jewelry'].includes(it.category)
);
const armorBySlot = {};
armorItems.forEach((it) => {
	const slot = it.armorSlot || it.slot || 'Misc';
	if (!armorBySlot[slot]) armorBySlot[slot] = [];
	armorBySlot[slot].push(it);
});
const possibleSlots = Object.keys(armorBySlot);
function cartesian(arrays) {
	if (arrays.length === 0) return [[]];
	const [first, ...rest] = arrays;
	const tails = cartesian(rest);
	const res = [];
	for (const a of first) for (const t of tails) res.push([a, ...t]);
	return res;
}

function readItemHP(it) {
	return (
		(it &&
			(it.hp || (it.effect && it.effect.hp) || (it.effects && (it.effects.HP || it.effects.hp)))) ||
		0
	);
}
function readItemSP(it) {
	return (
		(it &&
			(it.sp || (it.effect && it.effect.sp) || (it.effects && (it.effects.SP || it.effects.sp)))) ||
		0
	);
}

const level = parseInt(process.argv[2], 10) || 3;

for (const cls of classes) {
	const base = { STR: 5, DEX: 5, INT: 5, CON: 5, WIS: 5, CHA: 5 };
	const stats = { ...base };
	// stat points gained from levels: 6 points per level after 1
	const alloc = Math.max(0, level - 1) * 6;
	stats[cls.prim] += alloc;

	const weapons = Object.values(items)
		.filter((it) => it.category === 'Weapon' && meetsReq(it, cls.id, stats, level))
		.map((w) => w);
	weapons.unshift(null); // represent none

	const slotArrays = possibleSlots.map((slot) => {
		const arr = armorBySlot[slot]
			.filter((it) => meetsReq(it, cls.id, stats, level))
			.map((it) => it);
		arr.unshift(null);
		return arr;
	});
	const armorCombos = cartesian(slotArrays);

	let best = { dps: -Infinity, combo: null };

	for (const w1 of weapons) {
		for (const w2 of weapons) {
			if (w1 && w2 && w1.id === w2.id) continue;
			if (w1 && isTwoHanded(w1) && w2) continue;
			if (w2 && isTwoHanded(w2) && w1) continue;
			for (const armorChoice of armorCombos) {
				// compute weaponDamage and equipmentAtkSpd
				let weaponDamage = 0;
				let equipmentAtkSpd = 1.0;
				if (w1) weaponDamage += w1.damage || 0;
				if (w2 && w2.damage) weaponDamage += (w2.damage || 0) * 0.7;
				const hasW2 = w2 && w2.damage;
				if (w1 && w1.attackSpeed) {
					if (hasW2) equipmentAtkSpd *= w1.attackSpeed.single || w1.attackSpeed.dual || 1;
					else
						equipmentAtkSpd *=
							w1.attackSpeed.single || w1.attackSpeed.base || w1.attackSpeed.shield || 1;
				}
				if (hasW2) equipmentAtkSpd *= 1.1;
				for (const a of armorChoice)
					if (a && a.attackSpeed) {
						equipmentAtkSpd *= a.attackSpeed.base || a.attackSpeed.single || 1;
					}
				if (w1 && w1.weaponType && w1.weaponType.includes('Two-Handed') && !(w2 && w2.damage))
					weaponDamage += weaponDamage * 0.15;

				// stat bonus
				let statBonus = 0;
				if (cls.id === 'warrior') statBonus = stats.STR * STAT_MULTIPLIERS.STR.warrior.pAtk;
				else if (cls.id === 'rogue') statBonus = stats.DEX * 3;
				else if (cls.id === 'archer') statBonus = stats.DEX * 5;
				else if (cls.id === 'mage' || cls.id === 'tinkerer')
					statBonus = stats.INT * (STAT_MULTIPLIERS.INT.mage ? STAT_MULTIPLIERS.INT.mage.mAtk : 5);
				else if (cls.id === 'acolyte') statBonus = stats.WIS * 5;

				const dps = (weaponDamage + statBonus) * equipmentAtkSpd;
				if (dps > best.dps) best = { dps, combo: { w1, w2, armor: armorChoice } };
			}
		}
	}

	// Build equipment object
	const equipObj = { weapon1: best.combo.w1 || null, weapon2: best.combo.w2 || null };
	for (const [i, slot] of possibleSlots.entries())
		equipObj[slot.toLowerCase()] = best.combo.armor[i] || null;

	// Derived stats
	const c = CLASS_BONUSES[cls.id] || { startHp: 0, startSp: 0 };
	const conMult = (STAT_MULTIPLIERS.CON[cls.id] || { hp: 8 }).hp;
	const wisMult = (STAT_MULTIPLIERS.WIS[cls.id] || { sp: 10 }).sp;
	const strMult = STAT_MULTIPLIERS.STR[cls.id] || { pAtk: 1, pDef: 1 };
	const dexMult = STAT_MULTIPLIERS.DEX[cls.id] || { acc: 0.0025, eva: 0.0015, cr: 0.002 };
	const intMult = STAT_MULTIPLIERS.INT[cls.id] || { mAtk: 1, mRes: 1 };

	const str = stats.STR,
		dex = stats.DEX,
		int = stats.INT,
		con = stats.CON,
		wis = stats.WIS;
	let maxHp = Math.max(1, Math.floor(100 + (c.startHp || 0) + con * conMult));
	let maxSp = Math.max(1, Math.floor(100 + (c.startSp || 0) + wis * wisMult));

	// base pDef/mRes
	let pDef = str * strMult.pDef;
	let mRes = int * intMult.mRes;

	// add equipment HP/SP and defenses
	for (const k of Object.keys(equipObj)) {
		const it = equipObj[k];
		if (!it) continue;
		if (it.physicalDefense) pDef += it.physicalDefense;
		if (it.magicDefense) mRes += it.magicDefense;
		maxHp += readItemHP(it);
		maxSp += readItemSP(it);
	}

	// accuracy/evasion/crit
	const accuracy = dex * dexMult.acc;
	const evasion = dex * dexMult.eva;
	const critical = dex * dexMult.cr;

	// format armor line
	const armorNames = best.combo.armor.map((a) => (a ? a.name : null)).filter(Boolean);
	const armorText = armorNames.length ? armorNames.join(', ') : 'none';

	// format weapon line
	const weaponsText = (() => {
		const w1n = best.combo.w1 ? best.combo.w1.name : null;
		const w2n = best.combo.w2 ? (best.combo.w2.damage ? best.combo.w2.name : null) : null;
		if (w1n && w2n) return `${w1n} + ${w2n}`;
		if (w1n) return w1n;
		return 'none';
	})();

	// Print exactly in the format you asked
	console.log(`${cls.id.toUpperCase()}\n`);
	console.log(`Best DPS: ${best.dps.toFixed(2)}`);
	console.log(`Weapons: ${weaponsText}`);
	console.log(`Armor: ${armorText}`);
	console.log(`HP: ${maxHp}`);
	console.log(`SP: ${maxSp}`);
	console.log(`ACC: ${accuracy.toFixed(3)}`);
	console.log(`EVA: ${evasion.toFixed(3)}`);
	console.log(`P.DEF: ${pDef.toFixed(2)}`);
	console.log(`M.DEF: ${mRes.toFixed(2)}`);
	console.log(`CRIT: ${critical.toFixed(3)}`);
	console.log('\n');
}

console.log('Summary run complete.');
