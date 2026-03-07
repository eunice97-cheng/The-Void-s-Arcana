// src/lib/stores/traitHistory.js
// Comprehensive personality trait tracking system
// Tracks all trait changes with source, timestamp, and reason

import { writable, get } from 'svelte/store';

/**
 * @typedef {Object} TraitChange
 * @property {string} trait - The trait that changed (E, O, A, C, N)
 * @property {number} amount - The amount changed (usually +1)
 * @property {string} source - Where the change came from ('ritual', 'quest', 'choice', 'scene', 'manual')
 * @property {string|null} [sourceId] - Specific identifier (quest id, scene id, etc)
 * @property {number} timestamp - When the change occurred
 * @property {string|null} [description] - Human-readable description
 */

/**
 * @typedef {Object} TraitHistoryData
 * @property {TraitChange[]} history - All trait changes
 * @property {Record<string, number>} current - Current trait totals (E, O, A, C, N)
 * @property {Record<string, {ritual: number, quest: number, choice: number, scene: number, other: number}>} breakdown - Breakdown by source
 */

/** @type {import('svelte/store').Writable<TraitHistoryData>} */
export const traitHistory = writable({
	history: [],
	current: { E: 0, O: 0, A: 0, C: 0, N: 0 },
	breakdown: {
		E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
	}
});

/**
 * Add a trait change to the history
 * @param {string} trait - The trait (E, O, A, C, N)
 * @param {number} amount - The amount to change (default 1)
 * @param {string} source - The source ('ritual', 'quest', 'choice', 'scene', 'manual')
 * @param {Object} [options] - Additional options
 * @param {string} [options.sourceId] - Specific identifier
 * @param {string} [options.description] - Human-readable description
 * @param {number} [options.timestamp] - Custom timestamp (defaults to now)
 */
export function addTraitChange(trait, amount = 1, source = 'manual', options = {}) {
	const validTraits = ['E', 'O', 'A', 'C', 'N'];
	if (!validTraits.includes(trait)) {
		console.error(`[traitHistory] Invalid trait: ${trait}`);
		return;
	}

	const validSources = ['ritual', 'quest', 'choice', 'scene', 'manual', 'other'];
	const normalizedSource = validSources.includes(source) ? source : 'other';

	const change = {
		trait,
		amount,
		source: normalizedSource,
		sourceId: options.sourceId || null,
		timestamp: options.timestamp || Date.now(),
		description: options.description || null
	};

	traitHistory.update((data) => {
		// Add to history
		const newHistory = [...data.history, change];

		// Update current totals
		const newCurrent = { ...data.current };
		/** @type {keyof typeof newCurrent} */
		const traitKey = /** @type {any} */ (trait);
		newCurrent[traitKey] = (newCurrent[traitKey] || 0) + amount;

		// Update breakdown
		const newBreakdown = JSON.parse(JSON.stringify(data.breakdown)); // deep clone
		if (!newBreakdown[traitKey]) {
			newBreakdown[traitKey] = { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 };
		}
		/** @type {keyof typeof newBreakdown.E} */
		const sourceKey = /** @type {any} */ (normalizedSource);
		newBreakdown[traitKey][sourceKey] = (newBreakdown[traitKey][sourceKey] || 0) + amount;

		return {
			history: newHistory,
			current: newCurrent,
			breakdown: newBreakdown
		};
	});

	console.log(
		`[traitHistory] Added trait change: ${trait} +${amount} from ${normalizedSource}`,
		options
	);
}

/**
 * Recalculate breakdown from history (useful after loading or migration)
 */
export function recalculateTraitBreakdown() {
	traitHistory.update((data) => {
		const newCurrent = { E: 0, O: 0, A: 0, C: 0, N: 0 };
		const newBreakdown = {
			E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
		};

		// Recalculate from history
		data.history.forEach((change) => {
			/** @type {keyof typeof newCurrent} */
			const traitKey = /** @type {any} */ (change.trait);
			newCurrent[traitKey] = (newCurrent[traitKey] || 0) + change.amount;
			const source = change.source || 'other';
			/** @type {keyof typeof newBreakdown.E} */
			const sourceKey = /** @type {any} */ (source);
			if (newBreakdown[traitKey] && newBreakdown[traitKey][sourceKey] !== undefined) {
				newBreakdown[traitKey][sourceKey] += change.amount;
			}
		});

		return {
			history: data.history,
			current: newCurrent,
			breakdown: newBreakdown
		};
	});
}

/**
 * Load trait history from saved data
 * @param {TraitHistoryData | null | undefined} savedData
 */
export function loadTraitHistory(savedData) {
	if (!savedData) {
		traitHistory.set({
			history: [],
			current: { E: 0, O: 0, A: 0, C: 0, N: 0 },
			breakdown: {
				E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
			}
		});
		return;
	}

	traitHistory.set({
		history: Array.isArray(savedData.history) ? savedData.history : [],
		current: savedData.current || { E: 0, O: 0, A: 0, C: 0, N: 0 },
		breakdown: savedData.breakdown || {
			E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
		}
	});

	// Recalculate to ensure consistency
	recalculateTraitBreakdown();
}

/**
 * Migrate from old personality traits format (just the totals)
 * This creates a synthetic history with all changes marked as source: 'other'
 * @param {Record<string, number>} oldTraits
 */
export function migrateFromOldFormat(oldTraits) {
	console.log('[traitHistory] Migrating from old format:', oldTraits);

	/** @type {TraitChange[]} */
	const history = [];
	const current = { E: 0, O: 0, A: 0, C: 0, N: 0 };
	const breakdown = {
		E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
		N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
	};

	// Create synthetic history entries for existing traits
	const traits = ['E', 'O', 'A', 'C', 'N'];
	traits.forEach((trait) => {
		const value = oldTraits[trait] || 0;
		if (value > 0) {
			// Create a single entry for the total (since we don't have history)
			history.push({
				trait,
				amount: value,
				source: 'other',
				sourceId: 'migration',
				timestamp: Date.now(),
				description: `Migrated from old save format`
			});
			/** @type {keyof typeof current} */
			const traitKey = /** @type {any} */ (trait);
			current[traitKey] = value;
			breakdown[traitKey].other = value;
		}
	});

	traitHistory.set({ history, current, breakdown });
	console.log('[traitHistory] Migration complete. New data:', { history, current, breakdown });
}

/**
 * Get the current trait totals
 * @returns {Record<string, number>}
 */
export function getCurrentTraits() {
	return get(traitHistory).current;
}

/**
 * Get trait breakdown by source
 * @param {string} trait - The trait (E, O, A, C, N)
 * @returns {{ritual: number, quest: number, choice: number, scene: number, other: number}}
 */
export function getTraitBreakdown(trait) {
	const data = get(traitHistory);
	return data.breakdown[trait] || { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 };
}

/**
 * Clear all trait history (useful for new game)
 */
export function clearTraitHistory() {
	traitHistory.set({
		history: [],
		current: { E: 0, O: 0, A: 0, C: 0, N: 0 },
		breakdown: {
			E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
			N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
		}
	});
}
