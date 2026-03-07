/* @ts-check */
import { writable } from 'svelte/store';
import { sceneManager } from '$lib/stores/sceneManager';

// freeMode indicates whether the player is in the open/free mode (hub/exploration)
// Default is false. Keep this lightweight — UI and features opt-in to this flag.
export const freeMode = writable(false);

/**
 * Enable free mode.
 */
export function enableFreeMode() {
	try {
		freeMode.set(true);
		// Ensure any lingering scene loading state is cleared so the hub UI isn't
		// blocked by a stuck loading flag.
		try {
			if (sceneManager && typeof sceneManager.setLoading === 'function')
				sceneManager.setLoading(false);
		} catch (e) {
			/* ignore */
		}
	} catch (e) {
		// no-op but keep safe
		console.warn('[freeMode] enable failed', e);
	}
}

/**
 * Disable free mode.
 */
export function disableFreeMode() {
	try {
		freeMode.set(false);
	} catch (e) {
		console.warn('[freeMode] disable failed', e);
	}
}

export default freeMode;
