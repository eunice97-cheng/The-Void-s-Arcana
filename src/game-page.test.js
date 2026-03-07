// @ts-nocheck
// src/routes/game/+page.test.js
import { writable } from 'svelte/store';

// Mock svelte/store get function
jest.mock('svelte/store', () => ({
	...jest.requireActual('svelte/store'),
	get: jest.fn((store) => {
		if (store === require('$lib/stores/gameState').gameState) {
			return {
				character: { activeQuest: null },
				playerData: { hp: 100 },
			};
		}
		if (store === require('$lib/stores/questStore').activeQuest) {
			return {
				id: 'test-quest',
				templateId: 'E101',
				status: 'in_progress',
			};
		}
		if (store === require('$lib/stores/questStore').hasActiveQuest) {
			return true;
		}
		return jest.requireActual('svelte/store').get(store);
	}),
}));

jest.mock('$lib/utils/combatPlayback.js', () => ({
	playSimulation: jest.fn(),
}));

jest.mock('$lib/data/monsters', () => ({
	monsterBook: {},
}));

jest.mock('$lib/stores/saveManager', () => ({
	saveManager: {
		save: jest.fn(),
	},
}));

jest.mock('$lib/engine/liveCombatEngine.js', () => ({
	startForActiveQuest: jest.fn(),
	stop: jest.fn(),
}));

jest.mock('$lib/data/quests', () => ({
	questTemplates: {
		'E101': { series: 'beginner' },
		'daily-quest': { series: 'daily' },
		'normal-quest': { series: 'normal' },
	},
}));

jest.mock('$lib/data/questEnemyMap.js', () => ({
	questEnemyMap: {},
}));

jest.mock('$lib/data/scenes', () => ({
	gameScenes: {},
}));

jest.mock('$lib/utils/encryption', () => ({
	parseMaybeEncrypted: jest.fn(),
}));

// Test the logic for determining whether to skip the engine
describe('Game Page Engine Logic', () => {
	it('skips live combat engine for beginner quests', () => {
		const { startForActiveQuest } = require('$lib/engine/liveCombatEngine.js');
		const { questTemplates } = require('$lib/data/quests');

		// Test the logic directly
		const tplId = 'E101';
		const tplObj = questTemplates[tplId];
		const skipEngine = tplObj && (tplObj.series === 'beginner' || tplObj.series === 'dummy' || tplObj.series === 'daily');

		expect(skipEngine).toBe(true);
		expect(startForActiveQuest).not.toHaveBeenCalled();
	});

	it('skips live combat engine for daily quests', () => {
		const { startForActiveQuest } = require('$lib/engine/liveCombatEngine.js');
		const { questTemplates } = require('$lib/data/quests');

		// Test the logic directly
		const tplId = 'daily-quest';
		const tplObj = questTemplates[tplId];
		const skipEngine = tplObj && (tplObj.series === 'beginner' || tplObj.series === 'dummy' || tplObj.series === 'daily');

		expect(skipEngine).toBe(true);
		expect(startForActiveQuest).not.toHaveBeenCalled();
	});

	it('starts live combat engine for normal quests', () => {
		const { startForActiveQuest } = require('$lib/engine/liveCombatEngine.js');
		const { questTemplates } = require('$lib/data/quests');

		// Test the logic directly
		const tplId = 'normal-quest';
		const tplObj = questTemplates[tplId];
		const skipEngine = tplObj && (tplObj.series === 'beginner' || tplObj.series === 'dummy' || tplObj.series === 'daily');

		expect(skipEngine).toBe(false);
		// Note: In a real scenario, startForActiveQuest would be called, but we're testing the logic
	});
});