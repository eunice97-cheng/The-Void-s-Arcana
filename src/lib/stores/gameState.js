// src/lib/stores/gameState.js
import { writable, get } from 'svelte/store';
import { calculateDerived, getRankFromLevel, canAdvanceRank, getRankInfo } from '../utils/stats';

// Game state
export const initialGameState = {
	audioEnabled: true,
	currentScene: null,
	currentTown: 'mirrors-repose',
	gameInfoVisible: false,
	settingsVisible: false,
	uiVisible: true,
	activeSlotId: null, // tracks which slot this character is saved in
	playerData: {
		level: 1,
		exp: 0,
		maxExp: 484, // EXP required for level 2: 100 * 2^2.2 ≈ 484
		hp: 100,
		maxHp: 100,
		sp: 100,
		maxSp: 100,
		stamina: 200,
		maxStamina: 100,
		gold: 0,
		silver: 0,
		diamonds: 0
	},
	character: {
		name: '',
		class: null,
		unallocatedStatPoints: 0,
		rank: 'E', // Adventurer rank (E, D, C, B, A, S, SS, SSS)
		questsCompleted: 0, // Total quests completed
		questStats: {
			totalTaken: 0,
			totalCompleted: 0,
			totalFailed: 0,
			byRank: {
				daily: { taken: 0, completed: 0, failed: 0 },
				beginner: { taken: 0, completed: 0, failed: 0 },
				E: { taken: 0, completed: 0, failed: 0 },
				D: { taken: 0, completed: 0, failed: 0 },
				C: { taken: 0, completed: 0, failed: 0 },
				B: { taken: 0, completed: 0, failed: 0 },
				A: { taken: 0, completed: 0, failed: 0 },
				S: { taken: 0, completed: 0, failed: 0 },
				SS: { taken: 0, completed: 0, failed: 0 },
				SSS: { taken: 0, completed: 0, failed: 0 }
			}
		},
		achievements: /** @type {string[]} */ ([]), // Special achievements unlocked
		storyFlags: {}, // Key-value pairs for story progression
		stats: {
			// Character stats (STR, DEX, INT, CON, WIS, CHA)
			STR: 5,
			DEX: 5,
			INT: 5,
			CON: 5,
			WIS: 5,
			CHA: 5
		}
	},
	// default navigation mode: when true, nav clicks create a travel/navigation scene
	navigationMode: true,
	serverTimeOffset: 0
};

// Helper function to recalculate stat points based on current level
export function recalculateStatPoints() {
	const state = get(gameState);
	const level = state.playerData?.level || 1;
	const statPointsFromLevels = Math.max(0, level - 1) * 6; // 6 points per level gained

	console.log(
		'[recalculateStatPoints] Current level:',
		level,
		'Calculated stat points:',
		statPointsFromLevels
	);
	console.log(
		'[recalculateStatPoints] Current unallocatedStatPoints:',
		state.character?.unallocatedStatPoints
	);

	gameState.update((s) => ({
		...s,
		character: {
			...s.character,
			unallocatedStatPoints: statPointsFromLevels
		}
	}));

	console.log('[recalculateStatPoints] Updated unallocatedStatPoints to:', statPointsFromLevels);
}

// Helper function to recalculate derived stats (maxHp, maxSp, maxStamina) based on current stats and class
export function recalculateDerivedStats() {
	const state = get(gameState);
	const stats = state.character?.stats || {};
	const classId = state.character?.class;
	const level = state.playerData?.level || 1;
	const equipment = /** @type {any} */ (state.character)?.equipment || {};

	const derived = /** @type {any} */ (
		calculateDerived(stats, classId, level, equipment, { skills: state.character?.skills || [] })
	);

	console.log(
		'[recalculateDerivedStats] Stats:',
		stats,
		'Class:',
		classId,
		'Level:',
		level,
		'Equipment:',
		equipment,
		'Derived:',
		derived
	);

	gameState.update((s) => ({
		...s,
		playerData: {
			...s.playerData,
			maxHp: derived.maxHp,
			maxSp: derived.maxSp,
			maxStamina: derived.maxStamina
		}
	}));
}

// Helper function to update adventurer rank based on current level and requirements
export function updateAdventurerRank() {
	const state = get(gameState);
	const level = state.playerData?.level || 1;
	const currentRank = state.character?.rank || 'E';
	const questsCompleted = state.character?.questsCompleted || 0;
	const achievements = state.character?.achievements || [];

	// Get the rank this level would normally correspond to
	const levelBasedRank = getRankFromLevel(level);

	// Check if we can advance beyond the level-based rank
	let newRank = currentRank;

	// Try to advance to higher ranks if requirements are met
	const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
	const currentRankIndex = rankOrder.indexOf(currentRank);

	for (let i = currentRankIndex; i < rankOrder.length; i++) {
		const testRank = rankOrder[i];
		if (
			canAdvanceRank(currentRank, level, questsCompleted, achievements) ||
			testRank === levelBasedRank
		) {
			newRank = testRank;
		} else {
			break; // Can't advance further
		}
	}

	if (newRank !== currentRank) {
		console.log('[updateAdventurerRank] Rank advanced from', currentRank, 'to', newRank);
		gameState.update((s) => ({
			...s,
			character: {
				...s.character,
				rank: newRank
			}
		}));
		return true; // Rank was updated
	}

	return false; // No rank change
}

// Helper function to get quest category for stats
function getQuestCategory(tpl) {
	if (tpl.series === 'daily') return 'daily';
	if (tpl.series === 'beginner') return 'beginner';
	return tpl.requirements?.rank || 'E';
}

// Helper function to update quest stats when starting a quest
export function startQuestStats(tpl) {
	const category = getQuestCategory(tpl);
	gameState.update((s) => {
		const stats = s.character?.questStats || {
			totalTaken: 0,
			totalCompleted: 0,
			totalFailed: 0,
			byRank: {}
		};
		const byRank = stats.byRank || {};
		const rankStats = byRank[category] || { taken: 0, completed: 0, failed: 0 };
		rankStats.taken += 1;
		byRank[category] = rankStats;
		stats.totalTaken += 1;
		return {
			...s,
			character: {
				...s.character,
				questStats: stats
			}
		};
	});
}

// Helper function to update quest stats when completing a quest
export function completeQuestStats(tpl) {
	const category = getQuestCategory(tpl);
	gameState.update((s) => {
		const stats = s.character?.questStats || {
			totalTaken: 0,
			totalCompleted: 0,
			totalFailed: 0,
			byRank: {}
		};
		const byRank = stats.byRank || {};
		const rankStats = byRank[category] || { taken: 0, completed: 0, failed: 0 };
		rankStats.completed += 1;
		byRank[category] = rankStats;
		stats.totalCompleted += 1;
		return {
			...s,
			character: {
				...s.character,
				questStats: stats
			}
		};
	});
}

// Helper function to update quest stats when failing a quest
export function failQuestStats(tpl) {
	const category = getQuestCategory(tpl);
	gameState.update((s) => {
		const stats = s.character?.questStats || {
			totalTaken: 0,
			totalCompleted: 0,
			totalFailed: 0,
			byRank: {}
		};
		const byRank = stats.byRank || {};
		const rankStats = byRank[category] || { taken: 0, completed: 0, failed: 0 };
		rankStats.failed += 1;
		byRank[category] = rankStats;
		stats.totalFailed += 1;
		return {
			...s,
			character: {
				...s.character,
				questStats: stats
			}
		};
	});
}

// Helper function to increment quest completion count and check for rank advancement
export function completeQuest() {
	const state = get(gameState);
	const currentQuestsCompleted = state.character?.questsCompleted || 0;

	gameState.update((s) => ({
		...s,
		character: {
			...s.character,
			questsCompleted: currentQuestsCompleted + 1
		}
	}));

	// Check if this triggers a rank advancement
	updateAdventurerRank();
}

// Helper function to unlock an achievement
export function unlockAchievement(achievementId) {
	const state = get(gameState);
	const currentAchievements = /** @type {string[]} */ (state.character?.achievements || []);

	if (!currentAchievements.includes(achievementId)) {
		gameState.update((s) => ({
			...s,
			character: {
				...s.character,
				achievements: /** @type {string[]} */ ([...currentAchievements, achievementId])
			}
		}));

		console.log('[unlockAchievement] Unlocked achievement:', achievementId);

		// Check if this triggers a rank advancement
		updateAdventurerRank();
	}
}

export const gameState = writable(initialGameState);

// Scene manager
export const currentScene = writable(null);
export const sceneHistory = writable([]);

// Personality traits
export const personalityTraits = writable({});

// Audio settings
export const audioSettings = writable({
	masterVolume: 80,
	bgmVolume: 50,
	sfxVolume: 50,
	enabled: true
});
