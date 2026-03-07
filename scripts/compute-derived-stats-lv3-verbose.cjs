// scripts/compute-derived-stats-lv3-verbose.cjs
// Verbose version: prints detailed breakdown for each class at level 3
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

// Multipliers (must match src/lib/utils/stats.js)
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
		warrior: { hp: 24, hpRegen: 0.01 },
		archer: { hp: 20, hpRegen: 0.006 },
		rogue: { hp: 20, hpRegen: 0.006 },
		mage: { hp: 16, hpRegen: 0.002 },
		acolyte: { hp: 16, hpRegen: 0.002 },
		tinkerer: { hp: 16, hpRegen: 0.002 }
	},
	WIS: {
		warrior: { sp: 16, spRegen: 0.002 },
		archer: { sp: 20, spRegen: 0.006 },
		rogue: { sp: 20, spRegen: 0.006 },
		mage: { sp: 24, spRegen: 0.01 },
		acolyte: { sp: 24, spRegen: 0.01, healing: 0.005 },
		tinkerer: { sp: 24, spRegen: 0.01 }
	},
	STR: {
		warrior: { pAtk: 5, pDef: 3, melee: 0.005 },
		archer: { pAtk: 1, pDef: 2 },
		rogue: { pAtk: 3, pDef: 2, melee: 0.004 },
		mage: { pAtk: 1, pDef: 1 },
		acolyte: { pAtk: 1, pDef: 1 },
		tinkerer: { pAtk: 1, pDef: 1 }
	},
	DEX: {
		warrior: { range: 1, acc: 0.003, cr: 0.002, eva: 0.002, atkSpd: 0.012 },
		archer: {
			range: 5,
			acc: 0.0035,
			cr: 0.0025,
			eva: 0.002,
			rangeBonus: 0.005,
			detect: 0.003,
			atkSpd: 0.02
		},
		rogue: {
			range: 1.0,
			acc: 0.003,
			cr: 0.005,
			eva: 0.0025,
			rangeBonus: 0.001,
			detect: 0.003,
			stealth: 0.003,
			atkSpd: 0.025
		},
		mage: { range: 1, acc: 0.003, cr: 0.002, eva: 0.002, healing: 0.0015, atkSpd: 0.015 },
		acolyte: { range: 1, acc: 0.003, cr: 0.002, eva: 0.002, healing: 0.0015, atkSpd: 0.015 },
		tinkerer: { range: 1, acc: 0.003, cr: 0.002, eva: 0.002, healing: 0.002, atkSpd: 0.01 }
	},
	INT: {
		warrior: { mAtk: 1, mRes: 1 },
		archer: { mAtk: 1, mRes: 1 },
		rogue: { mAtk: 1, mRes: 1 },
		mage: { mAtk: 5, mRes: 3 },
		acolyte: { mAtk: 5, mRes: 3 },
		tinkerer: { mAtk: 5, mRes: 3, craft: 0.008, identify: 0.008 }
	}
};

const EQUIPMENT_BONUSES = {
	TWO_HAND_BONUS: { pAtk: 0.15 },
	SWORD_N_BOARD: { pDef: 0.1 },
	DUAL_WIELD: { atkSpd: 0.1 }
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
	return it.weaponType && it.weaponType.includes('Two-Handed');
}

// Use full armor candidate set: head/body/legs/boots/belt/necklace/rings
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
	for (const a of first) {
		for (const t of tails) {
			res.push([a, ...t]);
		}
	}
	return res;
}

const level = parseInt(process.argv[2], 10) || 3;

for (const cls of classes) {
	const base = { STR: 5, DEX: 5, INT: 5, CON: 5, WIS: 5, CHA: 5 };
	const alloc = Math.max(0, level - 1) * 6;
	const stats = { ...base };
	stats[cls.prim] += alloc;

	const weaponList = Object.values(items).filter((it) => it.category === 'Weapon');
	const usableWeapons = weaponList.filter((it) => meetsReq(it, cls.id, stats, level));
	const weapons = usableWeapons.map((w) => ({
		id: w.id,
		name: w.name,
		damage: w.damage,
		attackSpeed: w.attackSpeed,
		weaponType: w.weaponType,
		weaponClass: w.weaponClass,
		requirements: w.requirements
	}));
	weapons.unshift({ id: 'none', name: 'none' });

	// build slot arrays including 'none'
	const slotArrays = possibleSlots.map((slot) => {
		const arr = armorBySlot[slot]
			.filter((it) => meetsReq(it, cls.id, stats, level))
			.map((it) => ({
				id: it.id,
				name: it.name,
				attackSpeed: it.attackSpeed,
				physicalDefense: it.physicalDefense,
				magicDefense: it.magicDefense,
				slot: slot,
				hp: it.hp || 0,
				sp: it.sp || 0
			}));
		arr.unshift({ id: 'none', name: 'none', slot: slot, hp: 0, sp: 0 });
		return arr;
	});
	const armorCombos = cartesian(slotArrays);

	let best = { dps: 0, combo: null };
	for (const w1 of weapons) {
		for (const w2 of weapons) {
			if (w1.id !== 'none' && w2.id !== 'none' && w1.id === w2.id) continue;
			if (w1.id !== 'none' && isTwoHanded(w1) && w2.id !== 'none') continue;
			if (w2.id !== 'none' && isTwoHanded(w2) && w1.id !== 'none') continue;
			for (const armorChoice of armorCombos) {
				let weaponDamage = 0;
				let equipmentAtkSpd = 1.0;
				if (w1.id !== 'none') weaponDamage += w1.damage || 0;
				if (w2.id !== 'none' && w2.damage) weaponDamage += (w2.damage || 0) * 0.7;
				const hasW2 = w2.id !== 'none' && w2.damage;
				if (w1.id !== 'none' && w1.attackSpeed) {
					if (hasW2) equipmentAtkSpd *= w1.attackSpeed.single || w1.attackSpeed.dual || 1;
					else
						equipmentAtkSpd *=
							w1.attackSpeed.single || w1.attackSpeed.base || w1.attackSpeed.shield || 1;
				}
				if (hasW2) equipmentAtkSpd *= 1.1;
				for (const a of armorChoice) {
					if (a.id !== 'none' && a.attackSpeed) {
						if (a.attackSpeed.base) equipmentAtkSpd *= a.attackSpeed.base;
						else if (a.attackSpeed.single) equipmentAtkSpd *= a.attackSpeed.single;
					}
				}
				if (
					w1.id !== 'none' &&
					w1.weaponType &&
					w1.weaponType.includes('Two-Handed') &&
					!(w2.id !== 'none' && w2.damage)
				) {
					weaponDamage += weaponDamage * 0.15;
				}
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
	const equipObj = {
		weapon1: best.combo.w1.id === 'none' ? 'none' : best.combo.w1,
		weapon2: best.combo.w2.id === 'none' ? 'none' : best.combo.w2
	};
	for (const [i, slot] of possibleSlots.entries()) {
		const item = best.combo.armor[i];
		equipObj[slot.toLowerCase()] = item && item.id !== 'none' ? item : 'none';
	}

	// Recompute weaponDamage, equipmentAtkSpd and statBonus for the chosen combo (for display)
	const chosenW1 = best.combo.w1;
	const chosenW2 = best.combo.w2;
	let weaponDamage = 0;
	let equipmentAtkSpd = 1.0;
	if (chosenW1 && chosenW1.id && chosenW1.id !== 'none') weaponDamage += chosenW1.damage || 0;
	if (chosenW2 && chosenW2.id && chosenW2.id !== 'none' && chosenW2.damage)
		weaponDamage += (chosenW2.damage || 0) * 0.7;
	const hasWeapon2 = chosenW2 && chosenW2.id && chosenW2.id !== 'none' && chosenW2.damage;
	if (chosenW1 && chosenW1.id && chosenW1.id !== 'none' && chosenW1.attackSpeed) {
		if (hasWeapon2)
			equipmentAtkSpd *= chosenW1.attackSpeed.single || chosenW1.attackSpeed.dual || 1;
		else
			equipmentAtkSpd *=
				chosenW1.attackSpeed.single ||
				chosenW1.attackSpeed.base ||
				chosenW1.attackSpeed.shield ||
				1;
	}
	if (hasWeapon2) equipmentAtkSpd *= 1.1;
	// armor attack speed
	for (const slot of possibleSlots) {
		const it = equipObj[slot.toLowerCase()];
		if (it && it !== 'none' && it.attackSpeed) {
			if (it.attackSpeed.base) equipmentAtkSpd *= it.attackSpeed.base;
			else if (it.attackSpeed.single) equipmentAtkSpd *= it.attackSpeed.single;
		}
	}
	// two-hand bonus
	if (
		chosenW1 &&
		chosenW1.weaponType &&
		chosenW1.weaponType.includes('Two-Handed') &&
		!(chosenW2 && chosenW2.damage)
	) {
		weaponDamage += weaponDamage * 0.15;
	}
	let statBonus = 0;
	if (cls.id === 'warrior') statBonus = stats.STR * STAT_MULTIPLIERS.STR.warrior.pAtk;
	else if (cls.id === 'rogue') statBonus = stats.DEX * 3;
	else if (cls.id === 'archer') statBonus = stats.DEX * 5;
	else if (cls.id === 'mage' || cls.id === 'tinkerer')
		statBonus = stats.INT * (STAT_MULTIPLIERS.INT.mage ? STAT_MULTIPLIERS.INT.mage.mAtk : 5);
	else if (cls.id === 'acolyte') statBonus = stats.WIS * 5;

	// Calculate derived details
	const c = CLASS_BONUSES[cls.id] || { startHp: 0, startSp: 0 };
	const conMult = STAT_MULTIPLIERS.CON[cls.id] || { hp: 8, hpRegen: 0.001 };
	const wisMult = STAT_MULTIPLIERS.WIS[cls.id] || { sp: 10, spRegen: 0.003 };
	const strMult = STAT_MULTIPLIERS.STR[cls.id] || { pAtk: 1, pDef: 1 };
	const dexMult = STAT_MULTIPLIERS.DEX[cls.id] || {
		acc: 0.0025,
		cr: 0.002,
		eva: 0.0015,
		atkSpd: 0.01
	};
	const intMult = STAT_MULTIPLIERS.INT[cls.id] || { mAtk: 1, mRes: 1 };

	const str = stats.STR,
		dex = stats.DEX,
		int = stats.INT,
		con = stats.CON,
		wis = stats.WIS;

	let maxHp = Math.max(1, Math.floor(100 + (c.startHp || 0) + con * conMult.hp));
	let maxSp = Math.max(1, Math.floor(100 + (c.startSp || 0) + wis * wisMult.sp));

	// base pDef/mRes
	let pDef = str * strMult.pDef;
	let mRes = int * intMult.mRes;

	// apply armor
	for (const slot of possibleSlots) {
		const it = equipObj[slot.toLowerCase()] || 'none';
		if (it && it !== 'none') {
			if (it.physicalDefense) pDef += it.physicalDefense;
			if (it.magicDefense) mRes += it.magicDefense;
			if (it.hp) maxHp += it.hp;
			if (it.sp) maxSp += it.sp;
		}
	}

	const accuracy = dex * dexMult.acc;
	const evasion = dex * dexMult.eva;
	const critical = dex * dexMult.cr;

	console.log('=====================================================');
	console.log(cls.id.toUpperCase());
	console.log('Base stats:', stats);
	console.log(
		'Chosen weapons:',
		best.combo.w1.name || best.combo.w1.id,
		best.combo.w2.name || best.combo.w2.id
	);
	console.log(
		'Chosen armor:',
		best.combo.armor
			.map(
				(a) => `${a.slot}:${a.name}${a.hp ? ` (+HP ${a.hp})` : ''}${a.sp ? ` (+SP ${a.sp})` : ''}`
			)
			.join(' | ')
	);
	console.log(
		`weaponDamage: ${weaponDamage.toFixed(2)}, statBonus: ${statBonus.toFixed(2)}, equipmentAtkSpd: ${equipmentAtkSpd.toFixed(4)}`
	);
	console.log(
		`DPS calc: (${weaponDamage.toFixed(2)} + ${statBonus.toFixed(2)}) × ${equipmentAtkSpd.toFixed(4)} = ${((weaponDamage + statBonus) * equipmentAtkSpd).toFixed(2)}`
	);
	console.log(
		`DEX=${dex} => ACC=${accuracy.toFixed(4)} | EVA=${evasion.toFixed(4)} | CRIT=${critical.toFixed(4)}`
	);
	console.log(
		`HP breakdown: base=${100 + (c.startHp || 0)} + CON*${conMult.hp}*${con} => pre-equip=${Math.floor(100 + (c.startHp || 0) + con * conMult.hp)}; equip added=${Object.keys(
			equipObj
		).reduce((s, k) => {
			const it = equipObj[k];
			return s + (it && it !== 'none' && it.hp ? it.hp : 0);
		}, 0)}; final=${maxHp}`
	);
	console.log(
		`SP breakdown: base=${100 + (c.startSp || 0)} + WIS*${wisMult.sp}*${wis} => final=${maxSp}`
	);
	console.log(`P.DEF=${pDef.toFixed(2)} M.DEF=${mRes.toFixed(2)} DPS=${best.dps.toFixed(2)}`);
}

console.log('\nVerbose run complete.');
