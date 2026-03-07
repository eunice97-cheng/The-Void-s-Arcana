// src/lib/stores/saveManager.js
// @ts-nocheck
import { get } from 'svelte/store';
import { gameState, personalityTraits, audioSettings } from './gameState';
import { parseMaybeEncrypted, stringifyPreferEncrypted } from '../utils/encryption';
import itemDatabase from '$lib/data/items.json';
import { saveDataSchema } from '../utils/validation';
import { GameDataMigration } from '../utils/migration';
import { saveSlotsManager } from './saveSlotsManager';
import * as Sentry from '@sentry/browser';
import { show as showToast } from '$lib/stores/toastStore';

export class SaveManager {
	constructor() {
		this.saveKey = 'game_save_data';
		this.notificationCallback = null;
	}

	setNotificationCallback(callback) {
		this.notificationCallback = callback;
	}

	createSaveData() {
		const state = get(gameState);
		const traits = get(personalityTraits);
		const audio = get(audioSettings);

		const saveData = {
			timestamp: Date.now(),
			version: GameDataMigration.LATEST_VERSION,
			character: state.character,
			playerData: state.playerData,
			personality: traits,
			settings: {
				audioEnabled: audio.enabled,
				masterVolume: audio.masterVolume
			},
			currentScene: state.currentScene,
			activeSlotId: state.activeSlotId, // track which slot owns this save
			serverTimeOffset: state.serverTimeOffset || 0 // Persist server time offset for offline resume
		};

		// Validate save data
		try {
			saveDataSchema.parse(saveData);
		} catch (error) {
			console.error('Save data validation failed:', error);
			Sentry.captureException(error);
			throw new Error('Invalid save data structure');
		}

		return saveData;
	}

	/**
	 * Save the game.
	 * - `opts.auto = true` means this is an autosave; by default autosaves do not show a toast notification.
	 * - `opts.silent = true` suppresses all console/log/toast output.
	 * @param {{auto?:boolean, silent?:boolean}} [opts]
	 */
	saveGame(opts = {}) {
		try {
			// Always use the slot system for saves
			const result = saveSlotsManager.autoSave();
			if (!opts.silent) console.log('[saveManager] autoSave result:', result);
			if (result.ok) {
				const isAuto = !!opts.auto;
				const msg = isAuto ? 'Autosaved' : 'Game saved successfully!';
				// Do not surface a toast for autosaves by default; respect explicit `silent`.
				if (!opts.silent && !isAuto) this.showNotification(msg);
				return true;
			} else {
				if (!opts.silent)
					console.error('[saveManager] Save failed with reason:', result.reason, result.error);
				const isAuto = !!opts.auto;
				const msg = isAuto ? 'Autosave failed!' : 'Save failed!';
				if (!opts.silent && !isAuto) this.showNotification(msg, true);
				return false;
			}
		} catch (error) {
			if (!opts.silent) console.error('Save failed:', error);
			Sentry.captureException(error);
			const isAuto = !!opts.auto;
			const msg = isAuto ? 'Autosave failed!' : 'Save failed!';
			if (!opts.silent && !isAuto) this.showNotification(msg, true);
			return false;
		}
	}

	loadGame() {
		try {
			const raw = localStorage.getItem(this.saveKey);
			if (!raw) {
				return { ok: false, reason: 'no-save' };
			}

			let saveData = null;
			try {
				const parsed = parseMaybeEncrypted(raw, this.saveKey);
				saveData = parsed.data;
				// parsed.wasEncrypted indicates if we migrated older plaintext saves
			} catch (e) {
				console.error('Save data validation failed during parse:', e);
				Sentry.captureException(e);
				return { ok: false, reason: 'invalid-data', error: e };
			}

			// Migrate data if needed
			if (saveData.version !== GameDataMigration.LATEST_VERSION) {
				saveData = GameDataMigration.migrate(saveData);
			}

			// Validate loaded data
			try {
				saveDataSchema.parse(saveData);
			} catch (error) {
				console.error('Save data validation failed:', error);
				Sentry.captureException(error);
				return { ok: false, reason: 'invalid-data', error };
			}

			// Restore to stores
			gameState.update((state) => ({
				...state,
				character: saveData.character,
				playerData: saveData.playerData,
				currentScene: saveData.currentScene,
				serverTimeOffset: saveData.serverTimeOffset || 0,
				activeSlotId: saveData.activeSlotId || state.activeSlotId
			}));

			personalityTraits.set(saveData.personality);

			audioSettings.set({
				enabled: saveData.settings.audioEnabled,
				masterVolume: saveData.settings.masterVolume
			});

			this.showNotification('Game loaded successfully!');
			return { ok: true };
		} catch (error) {
			console.error('Load failed:', error);
			Sentry.captureException(error);
			return { ok: false, reason: 'error', error };
		}
	}

	showNotification(message, isError = false) {
		// Prefer an explicit callback if set (for custom UI); otherwise use toast snackbars.
		if (this.notificationCallback) {
			try {
				this.notificationCallback(message, isError);
			} catch (e) {
				console.warn('[saveManager] notification callback failed', e);
			}
			return;
		}
		try {
			showToast(message, { type: isError ? 'error' : 'success', duration: isError ? 6000 : 3000 });
		} catch (e) {
			// Fallback to console if toast store unavailable
			console.log(message);
		}
	}
}

export const saveManager = new SaveManager();

// Dev helper: expose a safe function to add consumable boxes to the current
// `gameState.character.inventory` and trigger a save. This helper only runs
// in browser/dev environments and avoids touching localStorage blobs
// directly (so it won't corrupt encrypted saves).
if (typeof window !== 'undefined') {
	try {
		window.__dev_addBoxes = function __dev_addBoxes(count = 1, boxId = 2240004, boxName = 'Random E Rank Equipment Box') {
			try {
				const state = get(gameState);
				const inv = Array.isArray(state.character?.inventory) ? [...state.character.inventory] : [];
				const idx = inv.findIndex(it => String(it.id) === String(boxId) || it.name === boxName);
				// If we have an authoritative DB entry, prefer to store the full DB item object
				const db = itemDatabase && itemDatabase[String(boxId)] ? itemDatabase[String(boxId)] : null;
				if (idx === -1) {
					if (db) inv.push({ ...db, qty: count });
					else inv.push({ id: boxId, name: boxName, category: 'Container - Consumable', consumable: true, qty: count });
				} else {
					// Merge with DB data if present and the existing entry lacks details
					if (db && (!inv[idx].category || !inv[idx].icon)) {
						inv[idx] = { ...db, qty: (inv[idx].qty || 0) + count };
					} else {
						inv[idx].qty = (inv[idx].qty || 0) + count;
					}
				}
				// Update gameState and persist using saveManager
				gameState.update(s => ({ ...(s || {}), character: { ...(s.character || {}), inventory: inv } }));
				// Trigger an autosave (non-silent so you'll see console confirmation)
				saveManager.saveGame({ auto: true, silent: false });
				return { ok: true, added: count };
			} catch (e) {
				console.error('__dev_addBoxes failed', e);
				return { ok: false, error: e && e.message };
			}
		};
	} catch (e) {
		// ignore failures attaching dev helper in restricted contexts
		console.warn('Could not attach __dev_addBoxes helper', e);
	}
}
