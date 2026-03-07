// src/lib/utils/stats.js
// Stat definitions and derived calculations for player characters

/** Base stats at level 1 (starter) */
export const BASE_STATS = {
	STR: 5,
	DEX: 5,
	INT: 5,
	CON: 5,
	WIS: 5,
	CHA: 5
};

/** Adventurer Rank System */
export const ADVENTURER_RANKS = {
	E: { minLevel: 1, maxLevel: 10, name: 'E Rank' },
	D: { minLevel: 11, maxLevel: 25, name: 'D Rank' },
	C: { minLevel: 26, maxLevel: 40, name: 'C Rank' },
	B: { minLevel: 41, maxLevel: 60, name: 'B Rank' },
	A: { minLevel: 61, maxLevel: 80, name: 'A Rank' },
	S: { minLevel: 81, maxLevel: 90, name: 'S Rank' },
	SS: { minLevel: 91, maxLevel: 95, name: 'SS Rank' },
	SSS: { minLevel: 96, maxLevel: 100, name: 'SSS Rank' }
};

/** Rank advancement requirements (beyond just reaching the level) */
export const RANK_REQUIREMENTS = {
	E: { questsCompleted: 0, specialAchievements: [] },
	D: { questsCompleted: 5, specialAchievements: [] },
	C: { questsCompleted: 15, specialAchievements: [] },
	B: { questsCompleted: 30, specialAchievements: ['guild_membership'] },
	A: { questsCompleted: 50, specialAchievements: ['guild_membership', 'first_boss_defeat'] },
	S: {
		questsCompleted: 75,
		specialAchievements: ['guild_membership', 'first_boss_defeat', 'rare_item_collection']
	},
	SS: {
		questsCompleted: 100,
		specialAchievements: [
			'guild_membership',
			'first_boss_defeat',
			'rare_item_collection',
			'legendary_quest'
		]
	},
	SSS: {
		questsCompleted: 150,
		specialAchievements: [
			'guild_membership',
			'first_boss_defeat',
			'rare_item_collection',
			'legendary_quest',
			'ultimate_challenge'
		]
	}
};

// Class starting flat bonuses (applied on top of the base 100 values)
const CLASS_BONUSES = {
	warrior: { startHp: 50, startSp: 0 },
	rogue: { startHp: 25, startSp: 25 },
	archer: { startHp: 25, startSp: 25 },
	mage: { startHp: 0, startSp: 50 },
	acolyte: { startHp: 0, startSp: 50 },
	tinkerer: { startHp: 0, startSp: 50 }
};

// Per-point derived increases from Excel table
const STAT_MULTIPLIERS = {
	// CON affects HP and HP regeneration
	CON: {
		warrior: { hp: 24, hpRegen: 0.01 },
		archer: { hp: 20, hpRegen: 0.006 },
		rogue: { hp: 20, hpRegen: 0.006 },
		mage: { hp: 16, hpRegen: 0.002 },
		acolyte: { hp: 16, hpRegen: 0.002 },
		tinkerer: { hp: 16, hpRegen: 0.002 }
	},
	// WIS affects SP and SP regeneration
	WIS: {
		warrior: { sp: 16, spRegen: 0.002 },
		archer: { sp: 20, spRegen: 0.006 },
		rogue: { sp: 20, spRegen: 0.006 },
		mage: { sp: 24, spRegen: 0.01 },
		acolyte: { sp: 24, spRegen: 0.01, healing: 0.005 },
		tinkerer: { sp: 24, spRegen: 0.01 }
	},
	// STR affects Physical Attack and Defense
	STR: {
		warrior: { pAtk: 5, pDef: 3, melee: 0.005 },
		archer: { pAtk: 1, pDef: 2 },
		rogue: { pAtk: 3, pDef: 2, melee: 0.004 },
		mage: { pAtk: 1, pDef: 1 },
		acolyte: { pAtk: 1, pDef: 1 },
		tinkerer: { pAtk: 1, pDef: 1 }
	},
	// DEX affects Accuracy, Critical, Evasion and various skills
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
	// INT affects Magical Attack and Defense
	INT: {
		warrior: { mAtk: 1, mRes: 1 },
		archer: { mAtk: 1, mRes: 1 },
		rogue: { mAtk: 1, mRes: 1 },
		mage: { mAtk: 5, mRes: 3 },
		acolyte: { mAtk: 5, mRes: 3 },
		tinkerer: { mAtk: 5, mRes: 3, craft: 0.008, identify: 0.008 }
	}
};

// Equipment-based special bonuses
const EQUIPMENT_BONUSES = {
	TWO_HAND_BONUS: { pAtk: 0.15 }, // +15% P.ATK when using 2H weapon
	SWORD_N_BOARD: { pDef: 0.1 }, // +10% P.DEF when using sword+shield
	DUAL_WIELD: { atkSpd: 0.1 } // +10% ATK_SPD when dual wielding
};

/**
 * Return a fresh copy of base stats for a new character.
 * @returns {{STR:number,DEX:number,INT:number,CON:number,WIS:number,CHA:number}}
 */
export function getBaseStats() {
	return { ...BASE_STATS };
}

/**
 * Get the adventurer rank based on level.
 * @param {number} level
 * @returns {string} Rank letter (E, D, C, B, A, S, SS, SSS)
 */
export function getRankFromLevel(level) {
	for (const [rank, data] of Object.entries(ADVENTURER_RANKS)) {
		if (level >= data.minLevel && level <= data.maxLevel) {
			return rank;
		}
	}
	return 'E'; // Default to E rank
}

/**
 * Get rank info including name and level range.
 * @param {string} rank
 * @returns {{minLevel:number,maxLevel:number,name:string}|null}
 */
export function getRankInfo(rank) {
	return /** @type {any} */ (ADVENTURER_RANKS)[rank] || null;
}

/**
 * Check if a character can advance to the next rank.
 * @param {string} currentRank
 * @param {number} level
 * @param {number} questsCompleted
 * @param {string[]} achievements
 * @returns {boolean}
 */
export function canAdvanceRank(currentRank, level, questsCompleted = 0, achievements = []) {
	const ranks = Object.keys(ADVENTURER_RANKS);
	const currentIndex = ranks.indexOf(currentRank);

	if (currentIndex === -1 || currentIndex === ranks.length - 1) {
		return false; // Invalid rank or already at max rank
	}

	const nextRank = ranks[currentIndex + 1];
	const nextRankInfo = /** @type {any} */ (ADVENTURER_RANKS)[nextRank];
	const requirements = /** @type {any} */ (RANK_REQUIREMENTS)[nextRank];

	// Check level requirement
	if (level < nextRankInfo.minLevel) {
		return false;
	}

	// Check quest completion requirement
	if (questsCompleted < requirements.questsCompleted) {
		return false;
	}

	// Check special achievements
	for (const achievement of requirements.specialAchievements) {
		if (!achievements.includes(achievement)) {
			return false;
		}
	}

	return true;
}

/**
 * Get the next rank a character can potentially advance to.
 * @param {string} currentRank
 * @returns {string|null}
 */
export function getNextRank(currentRank) {
	const ranks = Object.keys(ADVENTURER_RANKS);
	const currentIndex = ranks.indexOf(currentRank);

	if (currentIndex === -1 || currentIndex === ranks.length - 1) {
		return null;
	}

	return ranks[currentIndex + 1];
}

/**
 * Calculate derived values from stats, class, and equipment using the Excel stat multipliers.
 * Returns comprehensive stat calculations including HP/SP, regeneration, combat stats, and skills.
 *
 * @param {{STR:number,DEX:number,INT:number,CON:number,WIS:number,CHA:number}} stats
 * @param {string|null} classId
 * @param {number} level - Player level (default: 1)
 * @param {Object} equipment - Current equipment object
 * @returns {Object} All calculated derived stats
 */
import skillsDb from '../data/skills.json';

export function calculateDerived(stats, classId, level = 1, equipment = {}, options = {}) {
	const baseHp = 100;
	const baseSp = 100;
	const baseStamina = 100;

	const CLASS_BONUSES_ANY = /** @type {any} */ (CLASS_BONUSES);
	const STAT_MULTIPLIERS_ANY = /** @type {any} */ (STAT_MULTIPLIERS);

	const c =
		classId && CLASS_BONUSES_ANY[classId] ? CLASS_BONUSES_ANY[classId] : { startHp: 0, startSp: 0 };

	// Get multipliers for each stat, with defaults
	const conMult =
		classId && STAT_MULTIPLIERS_ANY.CON[classId]
			? STAT_MULTIPLIERS_ANY.CON[classId]
			: { hp: 8, hpRegen: 0.001 };
	const wisMult =
		classId && STAT_MULTIPLIERS_ANY.WIS[classId]
			? STAT_MULTIPLIERS_ANY.WIS[classId]
			: { sp: 10, spRegen: 0.003 };
	const strMult =
		classId && STAT_MULTIPLIERS_ANY.STR[classId]
			? STAT_MULTIPLIERS_ANY.STR[classId]
			: { pAtk: 1, pDef: 1 };
	const dexMult =
		classId && STAT_MULTIPLIERS_ANY.DEX[classId]
			? STAT_MULTIPLIERS_ANY.DEX[classId]
			: { range: 1, acc: 0.0025, cr: 0.002, eva: 0.0015, atkSpd: 0.01 };
	const intMult =
		classId && STAT_MULTIPLIERS_ANY.INT[classId]
			? STAT_MULTIPLIERS_ANY.INT[classId]
			: { mAtk: 1, mRes: 1 };

	// Get base stat values
	const str = Number(stats.STR || 0);
	const dex = Number(stats.DEX || 0);
	const int = Number(stats.INT || 0);
	const con = Number(stats.CON || 0);
	const wis = Number(stats.WIS || 0);

	// Calculate core resources
	let maxHp = Math.max(1, Math.floor(baseHp + (c.startHp || 0) + con * conMult.hp));
	let maxSp = Math.max(1, Math.floor(baseSp + (c.startSp || 0) + wis * wisMult.sp));
	let maxStamina = Math.max(1, Math.floor(baseStamina + level - 1)); // +1 max stamina per level

	// Calculate regeneration rates (as percentages per second/minute)
	const hpRegen = con * conMult.hpRegen;
	const spRegen = wis * wisMult.spRegen;

	// Calculate combat stats (base values)
	let pAtk = str * strMult.pAtk;
	let pDef = str * strMult.pDef;
	let mAtk = int * intMult.mAtk;
	let mRes = int * intMult.mRes;
	let rangeAtk = dex * (dexMult.range || 0); // Range attack damage (like P.ATK for ranged)

	// Calculate DEX-based stats
	let accuracy = dex * dexMult.acc;
	let critical = dex * dexMult.cr;
	let evasion = dex * dexMult.eva;
	let baseAtkSpd = 1.0; // Base attack speed multiplier
	let dexAtkSpdBonus = 0; // DEX attack speed bonus (additive with base)
	let equipmentAtkSpdBonus = 1.0; // Equipment speed multipliers (multiplicative)

	// Calculate DEX attack speed bonus (additive to base 1.0)
	if (dexMult.atkSpd) {
		dexAtkSpdBonus = dex * dexMult.atkSpd;
	}

	// Initialize weapon damage and stat bonus for DPS calculation
	let weaponDamage = 0;
	let statBonus = 0;

	// Determine stat bonus based on class
	if (classId) {
		switch (classId) {
			case 'warrior':
				statBonus = str * strMult.pAtk; // STR × 5
				break;
			case 'rogue':
				statBonus = dex * 3; // DEX × 3 for rogue (restored)
				break;
			case 'archer':
				statBonus = dex * 5; // DEX × 5 for archer
				break;
			case 'mage':
			case 'tinkerer':
				statBonus = int * intMult.mAtk; // INT × 5
				break;
			case 'acolyte':
				statBonus = wis * 5; // WIS × 5 for magical healing class
				break;
			default:
				statBonus = str * strMult.pAtk; // Default to STR
		}
	}

	// Apply equipment bonuses
	if (equipment) {
		const equip = /** @type {any} */ (equipment);

		// Weapon bonuses
		if (equip.weapon1 && equip.weapon1 !== 'none') {
			const weapon = equip.weapon1;
			if (weapon?.damage) {
				pAtk += weapon.damage;
				weaponDamage += weapon.damage; // Add to weapon damage for DPS calculation
			}
			if (weapon?.attackSpeed) {
				const weapon2 = equip.weapon2;
				const hasWeapon2 = weapon2 && weapon2 !== 'none';
				const isDualWielding = hasWeapon2 && weapon2.damage; // has damage = weapon

				if (isDualWielding) {
					// Dual wielding: use single speed (attacking fast with both weapons)
					if (weapon.attackSpeed?.single) equipmentAtkSpdBonus *= weapon.attackSpeed.single;
					else if (weapon.attackSpeed?.dual) equipmentAtkSpdBonus *= weapon.attackSpeed.dual;
				} else if (!hasWeapon2) {
					// Single wielding: use single speed only (no base)
					if (weapon.attackSpeed?.single) equipmentAtkSpdBonus *= weapon.attackSpeed.single;
				} else {
					// Shield: use shield speed if present, otherwise no bonus
					if (weapon.attackSpeed?.shield) equipmentAtkSpdBonus *= weapon.attackSpeed.shield;
				}
			}
		}

		if (equip.weapon2 && equip.weapon2 !== 'none') {
			const weapon = equip.weapon2;
			if (weapon?.damage) {
				// Dual wielding: weapon2 at 70% damage, average speed (no speed multiplication)
				const weapon2Damage = weapon.damage * 0.7;
				pAtk += weapon2Damage;
				weaponDamage += weapon2Damage;
				// Speed is already applied from weapon1, don't multiply again
			} else if (weapon?.physicalDefense) pDef += weapon.physicalDefense; // shield
		}

		// Dual wield bonus (only when wielding two weapons, not weapon + shield)
		if (equip.weapon2 && equip.weapon2 !== 'none' && equip.weapon2.damage) {
			equipmentAtkSpdBonus *= 1.0 + EQUIPMENT_BONUSES.DUAL_WIELD.atkSpd;
		} // Sword and shield bonus
		if (
			equip.weapon1 &&
			equip.weapon1 !== 'none' &&
			equip.weapon1.weaponClass === 'Sword' &&
			equip.weapon2 &&
			equip.weapon2 !== 'none' &&
			!equip.weapon2.damage
		) {
			pDef += EQUIPMENT_BONUSES.SWORD_N_BOARD.pDef;
		}

		// Two-hand weapon bonus
		if (
			equip.weapon1 &&
			equip.weapon1 !== 'none' &&
			equip.weapon1.weaponType &&
			equip.weapon1.weaponType.includes('Two-Handed') &&
			(!equip.weapon2 || equip.weapon2 === 'none' || !equip.weapon2.damage)
		) {
			pAtk += EQUIPMENT_BONUSES.TWO_HAND_BONUS.pAtk;
		}

		// Armor bonuses
		if (equip.head && equip.head !== 'none') {
			const armor = equip.head;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			// support flat HP/SP defined in several formats in items.json
			const hpAddHead =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddHead =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddHead) maxHp += hpAddHead;
			if (spAddHead) maxSp += spAddHead;
			if (armor?.attackSpeed) {
				// Ignore `attackSpeed.base` for armor pieces; prefer explicit modifiers
				// (single/dual/shield) if provided. `base` is deprecated for this slot.
				if (armor.attackSpeed?.single) equipmentAtkSpdBonus *= armor.attackSpeed.single;
				else if (armor.attackSpeed?.dual) equipmentAtkSpdBonus *= armor.attackSpeed.dual;
				else if (armor.attackSpeed?.shield) equipmentAtkSpdBonus *= armor.attackSpeed.shield;
			}
		}

		if (equip.body && equip.body !== 'none') {
			const armor = equip.body;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddBody =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddBody =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddBody) maxHp += hpAddBody;
			if (spAddBody) maxSp += spAddBody;
			if (armor?.attackSpeed) {
				// Ignore `attackSpeed.base` for armor pieces; prefer explicit modifiers
				// (single/dual/shield) if provided. `base` is deprecated for this slot.
				if (armor.attackSpeed?.single) equipmentAtkSpdBonus *= armor.attackSpeed.single;
				else if (armor.attackSpeed?.dual) equipmentAtkSpdBonus *= armor.attackSpeed.dual;
				else if (armor.attackSpeed?.shield) equipmentAtkSpdBonus *= armor.attackSpeed.shield;
			}
		}

		if (equip.legs && equip.legs !== 'none') {
			const armor = equip.legs;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddLegs =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddLegs =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddLegs) maxHp += hpAddLegs;
			if (spAddLegs) maxSp += spAddLegs;
			if (armor?.attackSpeed) {
				// Ignore `attackSpeed.base` for armor pieces; prefer explicit modifiers
				// (single/dual/shield) if provided. `base` is deprecated for this slot.
				if (armor.attackSpeed?.single) equipmentAtkSpdBonus *= armor.attackSpeed.single;
				else if (armor.attackSpeed?.dual) equipmentAtkSpdBonus *= armor.attackSpeed.dual;
				else if (armor.attackSpeed?.shield) equipmentAtkSpdBonus *= armor.attackSpeed.shield;
			}
		}

		if (equip.boots && equip.boots !== 'none') {
			const armor = equip.boots;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			if (armor?.hp) maxHp += armor.hp;
			if (armor?.sp) maxSp += armor.sp;
			if (armor?.attackSpeed) {
				// Ignore `attackSpeed.base` for armor pieces; prefer explicit modifiers
				// (single/dual/shield) if provided. `base` is deprecated for this slot.
				if (armor.attackSpeed?.single) equipmentAtkSpdBonus *= armor.attackSpeed.single;
				else if (armor.attackSpeed?.dual) equipmentAtkSpdBonus *= armor.attackSpeed.dual;
				else if (armor.attackSpeed?.shield) equipmentAtkSpdBonus *= armor.attackSpeed.shield;
			}
		}

		if (equip.belt && equip.belt !== 'none') {
			const armor = equip.belt;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddBelt =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddBelt =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddBelt) maxHp += hpAddBelt;
			if (spAddBelt) maxSp += spAddBelt;
		}

		if (equip.necklace && equip.necklace !== 'none') {
			const armor = equip.necklace;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddNeck =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddNeck =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddNeck) maxHp += hpAddNeck;
			if (spAddNeck) maxSp += spAddNeck;
		}

		if (equip.ring1 && equip.ring1 !== 'none') {
			const armor = equip.ring1;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddRing1 =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddRing1 =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddRing1) maxHp += hpAddRing1;
			if (spAddRing1) maxSp += spAddRing1;
		}

		if (equip.ring2 && equip.ring2 !== 'none') {
			const armor = equip.ring2;
			if (armor?.physicalDefense) pDef += armor.physicalDefense;
			if (armor?.magicDefense) mRes += armor.magicDefense;
			const hpAddRing2 =
				armor?.hp ||
				(armor?.effect && armor.effect.hp) ||
				(armor?.effects && (armor.effects.HP || armor.effects.hp)) ||
				0;
			const spAddRing2 =
				armor?.sp ||
				(armor?.effect && armor.effect.sp) ||
				(armor?.effects && (armor.effects.SP || armor.effects.sp)) ||
				0;
			if (hpAddRing2) maxHp += hpAddRing2;
			if (spAddRing2) maxSp += spAddRing2;
		}
	}

	// Calculate skill proficiencies (as percentages)
	const melee = (strMult.melee || 0) * str; // STR contributes to melee bonus %
	const rangebonus = (dexMult.rangeBonus || 0) * dex; // DEX range bonus %
	const craft = (intMult.craft || 0) * int;
	const stealth = (dexMult.stealth || 0) * dex;
	const detect = (dexMult.detect || 0) * dex;
	const healing = (wisMult.healing || 0) * wis + (dexMult.healing || 0) * dex;
	const identify = (intMult.identify || 0) * int;

	// Calculate attack speeds separately
	// Combat attack speed: includes DEX bonus for actual battle calculations
	const combatAtkSpd = Math.max(0.1, (baseAtkSpd + dexAtkSpdBonus) * equipmentAtkSpdBonus);

	// Display attack speed: equipment only (for DPS calculation per Sheet4)
	const displayAtkSpd = Math.max(0.1, equipmentAtkSpdBonus);

	// Calculate DPS using Sheet4 formula: (Weapon_Damage + Stat_Bonus) × Equipment_Speed_Only
	// DEX attack speed affects combat but not the displayed DPS stat
	let dps = (weaponDamage + statBonus) * displayAtkSpd;

	// Apply skill effects (optional)
	try {
		const skillList = Array.isArray(options?.skills)
			? options.skills
			: Array.isArray(options?.character?.skills)
				? options.character.skills
				: [];

		if (skillList && skillList.length) {
			// accumulate multipliers / flat bonuses
			let accuracyMultiplier = 1;
			let evasionMultiplier = 1;
			let pDefMultiplier = 1.0;
			let pDmgMultiplier = 1.0;

			for (const s of skillList) {
				const id = typeof s === 'string' ? s : s && s.id ? s.id : null;
				if (!id) continue;
				const meta = skillsDb.find((x) => x.id === id);
				if (!meta || !meta.effects) continue;
				const e = meta.effects;
				if (typeof e.accuracyFlat === 'number') {
					accuracyMultiplier += Number(e.accuracyFlat) || 0;
				}
				if (typeof e.evasionFlat === 'number') {
					evasionMultiplier += Number(e.evasionFlat) || 0;
				}
				if (typeof e.physicalDefenseFlat === 'number') {
					pDef += Number(e.physicalDefenseFlat) || 0;
				}
				if (typeof e.magicDefenseFlat === 'number') {
					mRes += Number(e.magicDefenseFlat) || 0;
				}
				if (typeof e.physicalDefensePercent === 'number') {
					pDefMultiplier += (Number(e.physicalDefensePercent) || 0) / 100;
				}
				if (typeof e.physicalDamagePercent === 'number') {
					pDmgMultiplier += (Number(e.physicalDamagePercent) || 0) / 100;
				}
			}
			// apply accuracy multiplier
			accuracy = accuracy * accuracyMultiplier;
			evasion = evasion * evasionMultiplier;

			// apply percent multipliers
			pDef = Math.round(pDef * pDefMultiplier);
			pAtk = Math.round(pAtk * pDmgMultiplier);
			dps = dps * pDmgMultiplier;
		}
	} catch (e) {
		// non-fatal: if skill application fails, continue with base calculations
		console.warn('apply skill effects failed', e);
	}

	return {
		// Core resources
		maxHp,
		maxSp,
		maxStamina,
		hpRegen,
		spRegen,

		// Combat stats
		pAtk,
		pDef,
		mAtk,
		mRes,
		rangeAtk,
		accuracy,
		critical,
		evasion,
		atkSpd: displayAtkSpd, // Display speed (equipment only)
		combatAtkSpd: combatAtkSpd, // Actual combat speed (includes DEX)
		dps,

		// Skill proficiencies
		melee,
		range: rangebonus,
		craft,
		stealth,
		detect,
		healing,
		identify
	};
}

export default { BASE_STATS, getBaseStats, calculateDerived };
