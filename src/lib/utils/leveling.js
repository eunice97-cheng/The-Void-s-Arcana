// src/lib/utils/leveling.js
// Leveling system utilities

/**
 * Calculate the total EXP required to reach a given level.
 * Formula: EXP Required for Level = 100 × (Level)^2.2
 * @param {number} level - The target level (must be >= 1)
 * @returns {number} Total EXP required to reach this level
 */
export function getExpRequiredForLevel(level) {
	if (level <= 1) return 0;
	return Math.floor(100 * Math.pow(level, 2.2));
}

/**
 * Calculate the EXP required to level up from current level to next level.
 * @param {number} currentLevel - Current player level
 * @returns {number} EXP needed for next level
 */
export function getExpForNextLevel(currentLevel) {
	return getExpRequiredForLevel(currentLevel + 1) - getExpRequiredForLevel(currentLevel);
}

/**
 * Get the maximum EXP for a given level (EXP needed to reach next level).
 * @param {number} level - Current level
 * @returns {number} Max EXP for this level
 */
export function getMaxExpForLevel(level) {
	return getExpForNextLevel(level);
}

/**
 * Check if player can level up and return new level if so.
 * @param {number} currentExp - Current total EXP
 * @param {number} currentLevel - Current level
 * @returns {number} New level if leveled up, otherwise current level
 */
export function getNewLevel(currentExp, currentLevel) {
	let level = currentLevel;
	while (currentExp >= getExpRequiredForLevel(level + 1)) {
		level++;
	}
	return level;
}

export default { getExpRequiredForLevel, getExpForNextLevel, getMaxExpForLevel, getNewLevel };
