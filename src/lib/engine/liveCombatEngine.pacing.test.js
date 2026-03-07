
import { jest } from '@jest/globals';
import { get } from 'svelte/store';

// Mock Svelte stores
jest.mock('svelte/store', () => ({
    get: jest.fn(),
    writable: jest.fn(() => ({
        subscribe: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
    }))
}));

// Mock dependencies
jest.mock('$lib/stores/gameState', () => ({
    gameState: {
        subscribe: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
    }
}));

jest.mock('$lib/stores/questStore', () => ({
    activeQuest: {
        subscribe: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
    },
    questProgress: {
        subscribe: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
    }
}));

jest.mock('$lib/stores/saveManager', () => ({
    saveManager: {
        saveGame: jest.fn()
    }
}));

jest.mock('$lib/stores/saveSlotsManager', () => ({}));

// Mock data
jest.mock('$lib/data/monsters', () => ({
    monsterBook: [
        { id: 'goblin-grunt', name: 'Goblin Grunt', stats: { hp: 1000, attack: 10, defense: 0, exp: 10 } },
        { id: 'hobgoblin-enforcer', name: 'Hobgoblin Enforcer', stats: { hp: 5000, attack: 50, defense: 10, exp: 100 } }
    ]
}));

jest.mock('$lib/data/quests', () => ({
    questTemplates: [
        { 
            id: 'E201', 
            name: 'Goblin Raid', 
            rank: 'E', 
            objective: '20x Goblin Grunt',
            dynamicSpawn: {
                lackey: 'goblin-grunt',
                boss: 'hobgoblin-enforcer',
                solo: false
            }
        }
    ]
}));

// Mock combatCore to simulate 1-shot kills
jest.mock('$lib/engine/combatCore', () => ({
    createCombatState: jest.fn((attacker, defender) => ({
        simTime: 0,
        finished: false,
        winner: null,
        nextAtk: 1000,
        nextDef: 1000,
        attacker,
        defender
    })),
    processTick: jest.fn((state) => {
        // Instant win for attacker
        state.finished = true;
        state.winner = 'attacker';
        state.simTime += 100; // Advance time slightly
        return { events: [], ops: [] };
    })
}));

jest.mock('$lib/utils/stats', () => ({
    calculateDerived: jest.fn(() => ({
        hp: 9999,
        maxHp: 9999,
        attack: 9999,
        defense: 9999,
        speed: 100
    }))
}));

// Import the engine under test
// We need to use dynamic import or require to ensure mocks are applied
let liveCombatEngine;

describe('Live Combat Engine Pacing Test', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        // Setup store mocks
        get.mockImplementation((store) => {
            if (store === require('$lib/stores/gameState').gameState) {
                return { playerData: { hp: 9999 } };
            }
            return {};
        });
        liveCombatEngine = await import('./liveCombatEngine.js');
    });

    test('E201 Offline Catch-Up Pacing (60s Offline)', async () => {
        console.log('Starting E201 Offline Catch-Up Simulation...');
        
        // Simulate 60 seconds of offline time
        // With 5s delay + ~0s combat, we expect ~12 enemies to be processed
        const catchUpTime = 60000; 
        
        let progressUpdates = [];
        const { activeQuest } = await import('$lib/stores/questStore');
        activeQuest.update.mockImplementation((cb) => {
            const q = { progress: 0 };
            const res = cb(q);
            if (res) progressUpdates.push(res.progress);
            return res;
        });

        // Start the quest with catch-up
        const promise = liveCombatEngine.startForActiveQuest('E201', { catchUpTimeMs: catchUpTime });
        
        // Wait a bit for the synchronous catch-up to process
        await new Promise(r => setTimeout(r, 100));
        
        // Stop the engine
        liveCombatEngine.stop();
        
        console.log('Progress updates:', progressUpdates);
        const maxProgress = Math.max(...progressUpdates, 0);
        console.log(`Processed ${maxProgress} enemies with ${catchUpTime}ms catch-up.`);
        
        // 60000 / 5100 (5s delay + 100ms combat) ~= 11.7
        // So we expect 11 or 12 enemies
        expect(maxProgress).toBeGreaterThanOrEqual(10);
        expect(maxProgress).toBeLessThanOrEqual(13);
        
    });
});
