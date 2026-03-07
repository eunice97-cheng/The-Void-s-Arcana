import { readFileSync } from 'fs';

const itemsData = JSON.parse(readFileSync('./src/lib/data/items.json', 'utf8'));

console.log('=== CORRECTED WEAPON DPS CALCULATIONS ===\n');
console.log('Formula: DPS = (Weapon Damage + Stat Bonus) × Attack Speed\n');

// Function to calculate DPS using the correct formula from stats.js
function calculateDPS(damage, attackSpeed, statBonus) {
	return Math.round((damage + statBonus) * attackSpeed * 100) / 100;
}

// Get all weapons
const weapons = Object.values(itemsData).filter(
	(item) => item.category === 'Weapon' && item.damage && item.attackSpeed
);

console.log('Assuming character meets weapon requirements:\n');

// Group by weapon class
const weaponClasses = {};
weapons.forEach((weapon) => {
	const weaponClass = weapon.weaponClass || 'Unknown';
	if (!weaponClasses[weaponClass]) {
		weaponClasses[weaponClass] = [];
	}
	weaponClasses[weaponClass].push(weapon);
});

// Calculate DPS for each weapon class
Object.keys(weaponClasses)
	.sort()
	.forEach((weaponClass) => {
		console.log(`=== ${weaponClass.toUpperCase()} ===`);
		weaponClasses[weaponClass]
			.sort((a, b) => (a.requirements?.level || 0) - (b.requirements?.level || 0))
			.forEach((weapon) => {
				const level = weapon.requirements?.level || 1;
				const damage = weapon.damage;
				const speed = weapon.attackSpeed;
				const reqStats = weapon.requirements?.stats || {};

				console.log(`${weapon.name} (Lv.${level})`);
				console.log(`  Damage: ${damage}`);

				// Determine stat bonus based on weapon class
				let statBonus = 0;
				let assumedStats = '';

				if (weaponClass === 'Magical Focus') {
					// For magical weapons, assume INT or WIS meets requirements
					const intReq = reqStats.INT || 0;
					const wisReq = reqStats.WIS || 0;
					const maxReq = Math.max(intReq, wisReq);
					statBonus = maxReq * 5; // INT/WIS × 5 for mages/acolytes
					assumedStats = `INT/WIS ${maxReq}`;
				} else if (
					weaponClass === 'Sword' ||
					weaponClass === 'Mace' ||
					weaponClass === 'Blunt' ||
					weaponClass === 'Hammer' ||
					weaponClass === 'Polearm'
				) {
					// Physical weapons - assume STR meets requirements
					const strReq = reqStats.STR || 10;
					statBonus = strReq * 5; // STR × 5 for warriors
					assumedStats = `STR ${strReq}`;
				} else if (weaponClass === 'Dagger') {
					// Daggers can be used by rogues - assume DEX meets requirements
					const dexReq = reqStats.DEX || reqStats.STR || 10;
					statBonus = dexReq * 3; // DEX × 3 for rogues
					assumedStats = `DEX ${dexReq}`;
				} else if (weaponClass === 'Bow' || weaponClass === 'Crossbow') {
					// Ranged weapons - assume DEX meets requirements
					const dexReq = reqStats.DEX || 10;
					statBonus = dexReq * 5; // DEX × 5 for archers
					assumedStats = `DEX ${dexReq}`;
				}

				console.log(`  Assumed: ${assumedStats} (Stat Bonus: ${statBonus})`);

				if (speed.single !== undefined) {
					const dpsSingle = calculateDPS(damage, speed.single, statBonus);
					console.log(`  Single-handed: Speed ${speed.single}, DPS ${dpsSingle}`);
				}

				if (speed.shield !== undefined) {
					const dpsShield = calculateDPS(damage, speed.shield, statBonus);
					console.log(`  With Shield: Speed ${speed.shield}, DPS ${dpsShield}`);
				}

				if (speed.base !== undefined) {
					const dpsBase = calculateDPS(damage, speed.base, statBonus);
					console.log(`  Base: Speed ${speed.base}, DPS ${dpsBase}`);
				}

				// Dual-wield calculation (if applicable)
				if (
					weapon.weaponType &&
					weapon.weaponType.includes('One Handed') &&
					speed.dual === undefined
				) {
					// Estimate dual-wield speed as 0.8x single speed
					const dualSpeed = speed.single * 0.8;
					const dpsDual = calculateDPS(damage, dualSpeed, statBonus);
					console.log(`  Dual-wield (est.): Speed ${dualSpeed.toFixed(2)}, DPS ${dpsDual}`);
				}

				console.log('');
			});
	});
