import { get } from 'svelte/store';
import { gameState } from '../stores/gameState';
import { serverNow } from '../stores/questStore';
import { questTemplates } from '../data/quests';

/**
 * Business logic utilities for quest management
 */

/**
 * Determines if a player can accept a quest
 * @param {string} questId - The quest ID
 * @param {string} rewardId - The selected reward ID (if applicable)
 * @param {boolean} active - Whether there's already an active quest
 * @returns {boolean} True if the quest can be accepted
 */
export function canAcceptQuest(questId, rewardId, active) {
	if (active) return false;

	const quest = questTemplates.find((q) => q.id === questId);
	const gs = get(gameState) || {};
	const ch = gs.character || {};
	const pd = gs.playerData || {};

	// Check requirements: level, stamina, rank
	if (quest && quest.requirements) {
		if (typeof quest.requirements.level === 'number' && (pd.level || 1) < quest.requirements.level)
			return false;
		if (
			typeof quest.requirements.stamina === 'number' &&
			(pd.stamina || 0) < quest.requirements.stamina
		)
			return false;
		if (quest.requirements.rank && ch.rank !== quest.requirements.rank) return false;
		if (quest.requirements.sceneCompleted) {
			const cleared = ch.clearedScenes || [];
			if (!cleared.includes(quest.requirements.sceneCompleted)) return false;
		}
	}

	// Check if prerequisite quest has been completed
	if (quest && quest.requires) {
		const completedQuests = ch.questsCompleted || {};
		if (!completedQuests[quest.requires]) {
			return false;
		}
	}

	// Prevent accepting quests during active apprenticeship times
	const apprentices =
		gs.character && Array.isArray(gs.character.apprenticeships)
			? /** @type {any} */ (gs.character).apprenticeships
			: [];
	const now = serverNow();

	const inApprenticeship = apprentices.some((a) => {
		if (!a.active || typeof a.slotStartHour !== 'number') return false;
		const d = new Date(now);
		const sessionStart = new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			a.slotStartHour,
			0,
			0
		).getTime();
		const sessionEnd = sessionStart + (a.dailyHours || 2) * 60 * 60 * 1000;
		const isInSession = now >= sessionStart && now < sessionEnd;

		return isInSession;
	});

	// Special rule: Archers need Arrow Craft to take guild (combat) quests.
	// Daily and Beginner series are non-combat and allowed without crafting skill.
	try {
		if (quest && quest.series === 'guild') {
			const isArcher = ch && (ch.class === 'archer' || ch.class === 'Archer');
			if (isArcher) {
				const skillId = 'archer_arrow_craft';
				const hasSkill =
					Array.isArray(ch.skills) &&
					ch.skills.some((s) => (typeof s === 'string' ? s === skillId : s && s.id === skillId));
				if (!hasSkill) return false;
			}
		}
	} catch (e) {
		// ignore and fallthrough to apprenticeship check
	}

	return !inApprenticeship;
}

/**
 * Gets the blocking reason if a quest cannot be accepted
 * @param {string} questId - The quest ID
 * @param {string} rewardId - The selected reward ID (if applicable)
 * @param {boolean} active - Whether there's already an active quest
 * @returns {string|null} The reason why the quest cannot be accepted, or null if it can
 */
export function getQuestBlockReason(questId, rewardId, active) {
	if (active) {
		return 'You already have an active quest in progress.';
	}

	const quest = questTemplates.find((q) => q.id === questId);
	const gs = get(gameState) || {};
	const ch = gs.character || {};
	const pd = gs.playerData || {};

	// Check requirements: level, stamina, rank
	if (quest && quest.requirements) {
		if (
			typeof quest.requirements.level === 'number' &&
			(pd.level || 1) < quest.requirements.level
		) {
			return `You need to be at least level ${quest.requirements.level} to accept this quest.`;
		}
		if (
			typeof quest.requirements.stamina === 'number' &&
			(pd.stamina || 0) < quest.requirements.stamina
		) {
			return `You need at least ${quest.requirements.stamina} stamina to accept this quest.`;
		}
		if (quest.requirements.rank && ch.rank !== quest.requirements.rank) {
			return `You need to be ${quest.requirements.rank} rank to accept this quest.`;
		}
		if (quest.requirements.sceneCompleted) {
			const cleared = ch.clearedScenes || [];
			if (!cleared.includes(quest.requirements.sceneCompleted)) {
				return `You must complete the story event "${quest.requirements.sceneCompleted}" first.`;
			}
		}
	}

	// Check if prerequisite quest has been completed
	if (quest && quest.requires) {
		const completedQuests = ch.questsCompleted || {};
		if (!completedQuests[quest.requires]) {
			const prereqQuest = questTemplates.find((q) => q.id === quest.requires);
			const prereqTitle = prereqQuest ? prereqQuest.title : quest.requires;
			return `You must complete "${prereqTitle}" first.`;
		}
	}

	// Check apprenticeship blocking
	const apprentices =
		gs.character && Array.isArray(/** @type {any} */ (gs.character).apprenticeships)
			? /** @type {any} */ (gs.character).apprenticeships
			: [];
	const now = serverNow();

	const inApprenticeship = apprentices.some((a) => {
		if (!a.active || typeof a.slotStartHour !== 'number') return false;
		const d = new Date(now);
		const sessionStart = new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			a.slotStartHour,
			0,
			0
		).getTime();
		const sessionEnd = sessionStart + (a.dailyHours || 2) * 60 * 60 * 1000;
		const isInSession = now >= sessionStart && now < sessionEnd;

		return isInSession;
	});

	if (inApprenticeship) {
		return 'You are scheduled for apprenticeship right now — cannot accept quests.';
	}

	// Archer / Arrow Craft rule: prevent accepting guild quests without Arrow Craft
	try {
		if (quest && quest.series === 'guild') {
			const isArcher = ch && (ch.class === 'archer' || ch.class === 'Archer');
			if (isArcher) {
				const skillId = 'archer_arrow_craft';
				const hasSkill =
					Array.isArray(ch.skills) &&
					ch.skills.some((s) => (typeof s === 'string' ? s === skillId : s && s.id === skillId));
				if (!hasSkill) {
					return 'As an Archer you must learn Arrow Craft before accepting guild combat quests.';
				}
			}
		}
	} catch (e) {
		// ignore
	}

	return null;
}

/**
 * Checks if the player is currently in an apprenticeship session
 * @returns {boolean} True if in apprenticeship
 */
export function isInApprenticeship() {
	const gs = get(gameState) || {};
	const apprentices =
		gs.character && Array.isArray(/** @type {any} */ (gs.character).apprenticeships)
			? /** @type {any} */ (gs.character).apprenticeships
			: [];
	const now = serverNow();

	return apprentices.some((a) => {
		if (!a.active || typeof a.slotStartHour !== 'number') return false;
		const d = new Date(now);
		const sessionStart = new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			a.slotStartHour,
			0,
			0
		).getTime();
		const sessionEnd = sessionStart + (a.dailyHours || 2) * 60 * 60 * 1000;
		const isInSession = now >= sessionStart && now < sessionEnd;

		return isInSession;
	});
}

/**
 * Determines if a quest should be visible on the quest board
 * @param {string} questId - The quest ID
 * @returns {boolean} True if the quest should be visible
 */
export function canSeeQuest(questId) {
	const quest = questTemplates.find((q) => q.id === questId);
	if (!quest) return false;

	const gs = get(gameState) || {};
	const ch = gs.character || {};
	const pd = gs.playerData || {};

	// Check requirements: level, stamina, rank
	if (quest.requirements) {
		if (typeof quest.requirements.level === 'number' && (pd.level || 1) < quest.requirements.level)
			return false;
		if (
			typeof quest.requirements.stamina === 'number' &&
			(pd.stamina || 0) < quest.requirements.stamina
		)
			return false;
		if (quest.requirements.rank && ch.rank !== quest.requirements.rank) return false;
		if (quest.requirements.sceneCompleted) {
			const cleared = ch.clearedScenes || [];
			if (!cleared.includes(quest.requirements.sceneCompleted)) return false;
		}
	}

	// Check prerequisite for chain quests
	if (quest.requires) {
		const completedQuests = ch.questsCompleted || {};
		if (!completedQuests[quest.requires]) return false;
	}

	// For standalone quests, check cooldown if completed
	if (!quest.requires) {
		const completedQuests = ch.questsCompleted || {};
		const completionTime = completedQuests[questId];
		if (completionTime) {
			const now = serverNow();
			let cooldownHours = 0;
			// Specific override: E101 - E110 use a 4 hour cooldown
			if (/^E10(?:[1-9]|10)$/.test(questId)) cooldownHours = 4;
			// Fallback prefix-based rules for other quests
			else if (questId.startsWith('E1')) cooldownHours = 6;
			else if (questId.startsWith('E2')) cooldownHours = 12;
			else if (questId.startsWith('E3')) cooldownHours = 18;
			if (now - completionTime < cooldownHours * 60 * 60 * 1000) return false;
		}
	}

	// For chain quests, hide if already completed
	if (quest.requires) {
		const completedQuests = ch.questsCompleted || {};
		if (completedQuests[questId]) return false;
	}

	return true;
}
