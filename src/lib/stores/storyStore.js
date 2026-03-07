import { writable, get } from 'svelte/store';
import { gameState } from './gameState';

export const storyNotifications = writable([]);

const STORY_EVENTS = [
    {
        id: 'story-level-3-guild',
        title: 'Summons from the Guild',
        message: 'Alexa is looking for you at the Guild Hall.',
        condition: (state) => (state.playerData?.level || 1) >= 3,
        // We can add more complex logic here, e.g., checking if a specific flag is NOT set
        // For now, we'll assume this notification persists until the player does something to clear it
        // or we can just show it whenever the condition is met and it's not "done".
        // Since we don't have a specific "story quest" system yet, let's just use a flag in gameState
        // or check if the player has visited the guild hall scene?
        // For this specific request, let's just show it if level >= 3.
        // To prevent it from showing forever, we might need a "storyProgress" tracker.
        isRelevant: (state) => {
             const level = state.playerData?.level || 1;
             // Example: Show if level >= 3 and NOT yet advanced to next story stage
             // For now, let's just check level. The user can "dismiss" it or we can clear it when they visit.
             // But the user asked for a "notification button... blinking".
             
             // Let's assume we track "story flags".
             const flags = state.character?.storyFlags || {};
             return level >= 3 && !flags['met_alexa_level_3'];
        }
    },
    {
        id: 'invitation-from-alexus',
        title: 'Invitation from Alexus',
        message: 'Alexus wants to meet you at the south forest.',
        actionScene: 'Scene107',
        isRelevant: (state) => {
             const cleared = state.character?.clearedScenes || [];
             return cleared.includes('Scene106') && !cleared.includes('Scene107');
        }
    },
    {
        id: 'summons-from-alexa-lvl6',
        title: 'Summons from Alexa',
        message: 'Alexa has a request for you at the Guild Hall.',
        actionScene: 'Scene114',
        isRelevant: (state) => {
             const level = state.playerData?.level || 1;
             const cleared = state.character?.clearedScenes || [];
             // Show if level >= 6 and Scene114 not yet completed
             return level >= 6 && !cleared.includes('Scene114');
        }
    }
];

export function checkStoryProgress() {
    const state = get(gameState);
    const active = [];

    for (const event of STORY_EVENTS) {
        if (event.isRelevant(state)) {
            active.push(event);
        }
    }

    storyNotifications.set(active);
}

// Call this whenever gameState changes significantly (e.g. level up)
// We can subscribe to gameState in FreeModeHub to trigger this.
