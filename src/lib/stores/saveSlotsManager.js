// src/lib/stores/saveSlotsManager.js
import { get } from 'svelte/store';
import { gameState, personalityTraits, audioSettings, recalculateDerivedStats } from './gameState';
import {
	traitHistory,
	loadTraitHistory,
	migrateFromOldFormat,
	getCurrentTraits,
	addTraitChange
} from './traitHistory';
import { parseMaybeEncrypted, stringifyPreferEncrypted } from '../utils/encryption';
import { saveDataSchema } from '../utils/validation';
import { sceneManager } from './sceneManager';
import { getExpRequiredForLevel } from '../utils/leveling';
import { GameDataMigration } from '../utils/migration';
import * as Sentry from '@sentry/browser';
import { show as showToast } from '$lib/stores/toastStore';
import { supabase } from '$lib/supabaseClient';

const STORAGE_KEY = 'game_save_slots';
const DEFAULT_SLOTS = 6;
const DEFAULT_FREE_SLOTS = 2; // first N unlocked/free
const SAVE_SCHEMA_VERSION = 1;

function now() {
	return Date.now();
}

function defaultSlots() {
	const slots = [];
	for (let i = 1; i <= DEFAULT_SLOTS; i++) {
		const locked = i > DEFAULT_FREE_SLOTS;
		const mode = i <= DEFAULT_FREE_SLOTS ? 'free' : 'locked';
		slots.push({
			id: i,
			name: `Slot ${i}`,
			locked: locked,
			mode,
			ts: null,
			meta: null, // { playerName, playerClass, level }
			payload: null // encrypted string
		});
	}
	return slots;
}

class SaveSlotsManager {
	constructor() {
		this.key = STORAGE_KEY;
		this.schemaVersion = SAVE_SCHEMA_VERSION;
		this._data = null; // lazy init - don't load during SSR
		this._initialized = false;
	}

	/** Ensure the data object always has a valid slots array. */
	_normalize(data) {
		if (!data || typeof data !== 'object') {
			return { version: this.schemaVersion, lastUsed: null, slots: defaultSlots() };
		}
		if (!Array.isArray(data.slots)) {
			data.slots = defaultSlots();
		}
		return data;
	}

	_ensureInitialized() {
		if (this._initialized) return;
		const loaded = this._load();
		this._data = this._normalize(loaded || null);
		this._initialized = true;
		// Try to pull from cloud on init
		this._pullFromCloud();
	}

	async _pullFromCloud() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (user) {
				const { data, error } = await supabase
					.from('profiles')
					.select('save_data')
					.eq('id', user.id)
					.single();

				if (data && data.save_data) {
					console.log('[SaveSlotsManager] Found cloud save data', data.save_data);

					const cloudData = this._normalize(data.save_data);
					const cloudHasData = !!cloudData.lastUsed || cloudData.slots.some(s => !!s.payload);
					const localSlots = this._data.slots || [];
					const isLocalDefault = !this._data.lastUsed && localSlots.every(s => !s.payload);
					if (isLocalDefault && cloudHasData) {
						this._data = cloudData;
						this._save(); // Persist to local
						if (typeof window !== 'undefined') window.location.reload();
					}
				}
			}
		} catch (e) {
			console.warn('[SaveSlotsManager] Cloud pull failed', e);
		}
	}

	_load() {
		try {
			if (typeof localStorage === 'undefined') return null;
			const raw = localStorage.getItem(this.key);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch (e) {
			console.warn('Failed to parse save slots from storage', e);
			return null;
		}
	}

	_save() {
		try {
			localStorage.setItem(this.key, JSON.stringify(this._data));
			// Attempt cloud sync if logged in
			this._syncToCloud();
		} catch (e) {
			console.error('Failed to write save slots to storage', e);
		}
	}

	async _syncToCloud() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (user) {
				await supabase.from('profiles').upsert({
					id: user.id,
					updated_at: new Date().toISOString(),
					save_data: this._data
				});
				console.log('[SaveSlotsManager] Synced to cloud');
			}
		} catch (e) {
			console.warn('[SaveSlotsManager] Cloud sync failed', e);
		}
	}

	async uploadToCloud() {
		this._ensureInitialized();
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('Not logged in');

			const { error } = await supabase.from('profiles').upsert({
				id: user.id,
				updated_at: new Date().toISOString(),
				save_data: this._data
			});
			
			if (error) throw error;
			console.log('[SaveSlotsManager] Uploaded to cloud');
			return { success: true };
		} catch (e) {
			console.error('[SaveSlotsManager] Upload failed', e);
			return { success: false, error: e.message };
		}
	}

	async downloadFromCloud() {
		this._ensureInitialized();
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('Not logged in');

			const { data, error } = await supabase
				.from('profiles')
				.select('save_data')
				.eq('id', user.id)
				.single();
			
			if (error) throw error;
			if (!data || !data.save_data) throw new Error('No cloud save found');

			this._data = this._normalize(data.save_data);
			localStorage.setItem(this.key, JSON.stringify(this._data));
			
			return { success: true };
		} catch (e) {
			console.error('[SaveSlotsManager] Download failed', e);
			return { success: false, error: e.message };
		}
	}

	listSlots() {
		this._ensureInitialized();
		return this._data.slots.map(
			/** @param {any} s */ (s) => ({
				id: s.id,
				name: s.name,
				locked: s.locked,
				mode: s.mode,
				ts: s.ts,
				meta: s.meta,
				payload: !!s.payload
			})
		);
	}

	/** @param {any} id */
	getSlot(id) {
		this._ensureInitialized();
		return this._data.slots.find(/** @param {any} s */ (s) => s.id === id) || null;
	}

	/** @param {any} id @param {any} name */
	setSlotName(id, name) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		if (!slot) return false;
		slot.name = name;
		this._save();
		return true;
	}

	/** Unlock all save slots (for development/testing) */
	unlockAllSlots() {
		this._ensureInitialized();
		let unlocked = 0;
		for (const slot of this._data.slots) {
			if (slot.locked) {
				slot.locked = false;
				slot.mode = 'free';
				unlocked++;
			}
		}
		if (unlocked > 0) {
			this._save();
			console.log(`[saveSlotsManager] Unlocked ${unlocked} save slots`);
		}
		return unlocked;
	}

	// Create save payload using existing saveManager.createSaveData if available
	createSavePayload() {
		console.log('[saveSlotsManager] createSavePayload called');
		// fallback: assemble minimal data from gameState (skip saveManager to avoid circular import issues)
		const state = get(gameState);
		// Normalize playerData to avoid invalid current > max values
		/** @param {any} pd */
		const normalizePlayerData = (pd) => ({
			hp: Math.max(0, Math.min(pd.hp ?? 0, pd.maxHp ?? pd.hp ?? 0)),
			maxHp: pd.maxHp ?? pd.hp ?? 0,
			sp: Math.max(0, Math.min(pd.sp ?? 0, pd.maxSp ?? pd.sp ?? 0)),
			maxSp: pd.maxSp ?? pd.sp ?? 0,
			stamina: Math.max(0, Math.min(pd.stamina ?? 0, pd.maxStamina ?? pd.stamina ?? 0)),
			maxStamina: pd.maxStamina ?? pd.stamina ?? 0,
			level: pd.level ?? 1,
			exp: pd.exp ?? 0,
			maxExp: getExpRequiredForLevel((pd.level ?? 1) + 1),
			gold: pd.gold ?? 0,
			silver: pd.silver ?? 0,
			diamonds: pd.diamonds ?? 0
		});

		const safePlayerData =
			state && state.playerData ? normalizePlayerData(state.playerData) : normalizePlayerData({});

		const char = /** @type {any} */ (state && state.character ? state.character : {});
		const payload = {
			timestamp: now(),
			version: GameDataMigration.LATEST_VERSION,
			character: state.character,
			// persist cleared scenes (if present on character) so navigation unlocks survive reloads
			clearedScenes: Array.isArray(char.clearedScenes) ? char.clearedScenes : [],
			playerData: safePlayerData,
			personality: get(personalityTraits),
			traitHistory: get(traitHistory), // Save comprehensive trait history
			settings: get(audioSettings),
			currentScene: state.currentScene,
			activeSlotId: state.activeSlotId // include active slot tracking
		};
		console.log('[saveSlotsManager] Saving personality traits:', get(personalityTraits));
		console.log('[saveSlotsManager] Saving trait history:', get(traitHistory));
		console.log('[saveSlotsManager] Payload personality:', payload.personality);
		return payload;
	}

	/** @param {any} id @param {{name?:string}} [options] */
	saveToSlot(id, options = {}) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		console.log('[saveSlotsManager] saveToSlot called for slot:', id, 'slot:', slot);
		if (!slot) return { ok: false, reason: 'no-slot' };
		if (slot.locked) return { ok: false, reason: 'locked' };

		const state = /** @type {any} */ (get(gameState));
		console.log('[saveSlotsManager] current gameState:', state);

		try {
			const saveObj = this.createSavePayload();
			console.log('[saveSlotsManager] created save payload:', saveObj);

			// validate shape
			try {
				saveDataSchema.parse(saveObj);
			} catch (err) {
				console.warn('Save payload validation failed', err);
			}

			const encrypted = stringifyPreferEncrypted(saveObj);
			slot.payload = encrypted;
			slot.ts = now();
			slot.meta = {
				playerName: saveObj.character?.name || null,
				playerClass: saveObj.character?.class || null,
				level: saveObj.playerData?.level || null,
				avatar:
					/** @type {any} */ (saveObj.character) && /** @type {any} */ (saveObj.character).avatar
						? /** @type {any} */ (saveObj.character).avatar
						: null
			};
			if (options.name) slot.name = options.name;
			console.log('[saveSlotsManager] slot after save:', slot);
			this._data.lastUsed = id;
			this._save();
			console.log('[saveSlotsManager] saved to localStorage');
			return { ok: true };
		} catch (e) {
			console.error('saveToSlot failed', e);
			return { ok: false, reason: 'error', error: e };
		}
	}

	/** @param {any} id */
	loadFromSlot(id) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		if (!slot) return { ok: false, reason: 'no-slot' };
		if (!slot.payload) return { ok: false, reason: 'empty' };

		try {
			let saveObj = null;
			try {
				const parsedRes = parseMaybeEncrypted(slot.payload);
				saveObj = parsedRes.data;
				// If the slot payload was plaintext, re-encrypt this slot payload in-place
				if (parsedRes.wasEncrypted === false) {
					try {
						slot.payload = stringifyPreferEncrypted(saveObj);
						this._save();
					} catch (e) {
						// non-fatal; parsing succeeded so continue
						console.warn('Failed to re-encrypt slot payload during migration', e);
					}
				}
			} catch (e) {
				console.error('Failed to parse slot payload', e);
				try {
					Sentry.captureException(e);
				} catch (s) {}
				try {
					showToast('Failed to parse save data (slot). The file may be corrupt.', {
						type: 'error',
						duration: 6000
					});
				} catch (t) {}
				return { ok: false, reason: 'invalid-data', error: e };
			}

			// Migrate data if needed
			if (saveObj.version !== GameDataMigration.LATEST_VERSION) {
				saveObj = GameDataMigration.migrate(saveObj);
			}

			// validate — but be forgiving: if validation fails, attempt to salvage common older save shapes
			try {
				saveDataSchema.parse(saveObj);
				console.log('[saveSlotsManager] loadFromSlot validation passed');
			} catch (err) {
				console.warn(
					'[saveSlotsManager] validation failed, attempting to salvage save object',
					err
				);
				try {
					Sentry.captureException(err);
				} catch (s) {}
				try {
					// Attempt basic normalization for missing playerData or character fields
					const salvaged = Object.assign({}, saveObj);
					if (!salvaged.playerData || typeof salvaged.playerData !== 'object') {
						salvaged.playerData = {
							hp: 100,
							maxHp: 100,
							sp: 100,
							maxSp: 100,
							stamina: 100,
							maxStamina: 100,
							level: 1,
							exp: 0,
							maxExp: getExpRequiredForLevel(2),
							gold: 0,
							silver: 0,
							diamonds: 0
						};
					} else {
						// fill missing numeric fields with safe defaults
						const pd = salvaged.playerData;
						salvaged.playerData = {
							hp: Number(pd.hp ?? 100),
							maxHp: Number(pd.maxHp ?? pd.hp ?? 100),
							sp: Number(pd.sp ?? 100),
							maxSp: Number(pd.maxSp ?? pd.sp ?? 100),
							stamina: Number(pd.stamina ?? 100),
							maxStamina: Number(pd.maxStamina ?? pd.stamina ?? 100),
							level: Number(pd.level ?? 1),
							exp: Number(pd.exp ?? 0),
							maxExp: getExpRequiredForLevel(Number(pd.level ?? 1) + 1),
							gold: Number(pd.gold ?? 0),
							silver: Number(pd.silver ?? 0),
							diamonds: Number(pd.diamonds ?? 0)
						};
					}

					if (!salvaged.character || typeof salvaged.character !== 'object') {
						salvaged.character = { name: 'Adventurer', class: null };
					}

					// Ensure clearedScenes exists as array
					if (!Array.isArray(salvaged.clearedScenes)) {
						salvaged.clearedScenes = Array.isArray(
							salvaged.character && salvaged.character.clearedScenes
						)
							? salvaged.character.clearedScenes
							: [];
					}

					// Preserve personality traits and settings if they exist
					if (!salvaged.personality && saveObj.personality) {
						salvaged.personality = saveObj.personality;
					}
					if (!salvaged.settings && saveObj.settings) {
						salvaged.settings = saveObj.settings;
					}

					// replace saveObj with salvaged for restore steps below
					saveObj = salvaged;
					console.warn(
						'[saveSlotsManager] salvage applied to save object — proceeding with restore'
					);
				} catch (salvageErr) {
					console.error('[saveSlotsManager] salvage failed', salvageErr);
					try {
						Sentry.captureException(salvageErr);
					} catch (s) {}
					try {
						showToast('Save file is invalid and could not be recovered.', {
							type: 'error',
							duration: 6000
						});
					} catch (t) {}
					return { ok: false, reason: 'invalid-data', error: err };
				}
			}

			console.log('[saveSlotsManager] restoring to gameState:', saveObj);

			// Restore data into stores (similar to existing saveManager behavior)
			// Normalize incoming playerData to avoid current > max issues
			try {
				if (saveObj && saveObj.playerData) {
					const pd = saveObj.playerData;
					saveObj.playerData = {
						hp: Math.max(0, Math.min(pd.hp ?? 0, pd.maxHp ?? pd.hp ?? 0)),
						maxHp: pd.maxHp ?? pd.hp ?? 0,
						sp: Math.max(0, Math.min(pd.sp ?? 0, pd.maxSp ?? pd.sp ?? 0)),
						maxSp: pd.maxSp ?? pd.sp ?? 0,
						stamina: Math.max(0, Math.min(pd.stamina ?? 0, pd.maxStamina ?? pd.stamina ?? 0)),
						maxStamina: pd.maxStamina ?? pd.stamina ?? 0,
						level: pd.level ?? 1,
						exp: pd.exp ?? 0,
						maxExp: getExpRequiredForLevel((pd.level ?? 1) + 1),
						gold: pd.gold ?? 0,
						silver: pd.silver ?? 0,
						diamonds: pd.diamonds ?? 0
					};
				}
			} catch (e) {
				console.warn('[saveSlotsManager] normalization failed', e);
			}

			gameState.update((state) => ({
				...state,
				character: {
					...(saveObj.character || {}),
					clearedScenes: Array.isArray(saveObj.clearedScenes)
						? saveObj.clearedScenes
						: saveObj.character && Array.isArray(saveObj.character.clearedScenes)
							? saveObj.character.clearedScenes
							: []
				},
				playerData: saveObj.playerData,
				currentScene: saveObj.currentScene || 'Scene001', // Default to Scene001 if null
				activeSlotId: id, // track which slot this character is using
				serverTimeOffset: saveObj.serverTimeOffset || 0 // Restore server time offset
			}));

			// Recalculate derived stats (maxHp, maxSp, maxStamina) based on loaded character data
			recalculateDerivedStats();

			// Note: Scene loading is now handled automatically by the game page's gameState subscription
			// when it detects gameState has a currentScene but sceneManager doesn't

			console.log('[saveSlotsManager] Loading personality traits:', saveObj.personality);
			console.log('[saveSlotsManager] saveObj keys:', Object.keys(saveObj));

			// Handle personality traits - check both new and old locations for backward compatibility
			let traitsToLoad = saveObj.personality || {};
			if (!saveObj.personality && saveObj.character && saveObj.character.personalityTraits) {
				console.log(
					'[saveSlotsManager] Found traits in old location, migrating:',
					saveObj.character.personalityTraits
				);
				traitsToLoad = saveObj.character.personalityTraits;
				// Also update the saveObj for future saves
				saveObj.personality = traitsToLoad;
				delete saveObj.character.personalityTraits;
			}

			// Load trait history if available, otherwise migrate from old format
			if (saveObj.traitHistory) {
				console.log('[saveSlotsManager] Loading trait history:', saveObj.traitHistory);
				loadTraitHistory(saveObj.traitHistory);

				// Check if personality and traitHistory.current are out of sync
				// This can happen if the save has old ritual data in personality but not in traitHistory
				const currentTraits = getCurrentTraits();
				const traits = ['E', 'O', 'A', 'C', 'N'];
				let needsSync = false;

				for (const trait of traits) {
					const personalityValue = traitsToLoad[trait] || 0;
					const historyValue = currentTraits[trait] || 0;
					if (personalityValue > historyValue) {
						needsSync = true;
						const diff = personalityValue - historyValue;
						console.warn(
							`[saveSlotsManager] Trait mismatch for ${trait}: personality=${personalityValue}, history=${historyValue}, diff=${diff}`
						);

						// Add missing trait changes to history (don't replace, just add the difference)
						addTraitChange(trait, diff, 'other', {
							sourceId: 'migration-sync',
							description: `Restored missing ${trait} traits from old save data`
						});
					}
				}

				if (needsSync) {
					console.log('[saveSlotsManager] Synced missing traits from personality to traitHistory');
				}

				// Set personalityTraits from the history's current totals (after potential sync)
				const finalTraits = getCurrentTraits();
				personalityTraits.set(finalTraits);
				console.log('[saveSlotsManager] Set personality traits from history:', finalTraits);
			} else {
				// No trait history - migrate from old format
				console.log('[saveSlotsManager] No trait history found, migrating from old format');
				migrateFromOldFormat(traitsToLoad);
				// After migration, set personalityTraits from the migrated data
				const currentTraits = getCurrentTraits();
				personalityTraits.set(currentTraits);
				console.log('[saveSlotsManager] Set personality traits after migration:', currentTraits);
			}

			audioSettings.set(saveObj.settings || { enabled: true, masterVolume: 80 });

			// Also restore sceneManager's internal history so UI components that rely
			// on the manager's history see the restored cleared scenes immediately.
			try {
				const restored = Array.isArray(saveObj.clearedScenes)
					? saveObj.clearedScenes
					: saveObj.character && Array.isArray(saveObj.character.clearedScenes)
						? saveObj.character.clearedScenes
						: [];
				if (
					restored &&
					restored.length &&
					sceneManager &&
					typeof sceneManager.restoreSceneHistory === 'function'
				) {
					try {
						sceneManager.restoreSceneHistory(restored);
					} catch (e) {
						/* non-fatal */
					}
				}
			} catch (e) {
				/* ignore */
			}

			console.log(
				'[saveSlotsManager] gameState updated with currentScene:',
				saveObj.currentScene || 'Scene001'
			);

			this._data.lastUsed = id;
			this._save();

			// After restoring gameState and saving slot metadata, re-check quest completion
			// status so expired quests are immediately marked completed and submittable.
			// Use setTimeout to ensure gameState updates have propagated to subscribers.
			try {
				setTimeout(() => {
					import('./questStore.js')
						.then((qs) => {
							if (qs && typeof qs.recheckQuestsAfterLoad === 'function') {
								try {
									qs.recheckQuestsAfterLoad();
								} catch (e) {
									console.warn('recheckQuestsAfterLoad failed', e);
								}
							}
						})
						.catch((e) => {
							/* ignore */
						});
				}, 100);
			} catch (e) {
				/* ignore */
			}

			return { ok: true, save: saveObj };
		} catch (e) {
			console.error('loadFromSlot failed', e);
			// Expose debugging info on window so users can easily copy it from the console.
			try {
				if (typeof window !== 'undefined') {
					try {
						const errAny = /** @type {any} */ (e);
						const msg =
							errAny && (errAny.stack || errAny.message)
								? errAny.stack || errAny.message
								: String(errAny);
						/** @type {any} */ (window)._lastLoadError = {
							error: msg,
							slotId: id,
							slot: slot ? { id: slot.id, name: slot.name, ts: slot.ts, meta: slot.meta } : null,
							rawPayload: slot && slot.payload ? slot.payload : null,
							timestamp: Date.now()
						};
					} catch (w) {
						/* ignore */
					}
				}
			} catch (w) {
				/* ignore */
			}
			try {
				Sentry.captureException(e);
			} catch (s) {}
			try {
				showToast(
					'An error occurred while loading the save slot (500). Check console or window._lastLoadError for details.',
					{ type: 'error', duration: 12000 }
				);
			} catch (t) {}
			return { ok: false, reason: 'error', error: e };
		}
	}

	/** @param {any} id */
	deleteSlot(id) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		if (!slot) return { ok: false, reason: 'no-slot' };

		// Prevent deleting the slot that the running character is currently using
		try {
			const state = /** @type {any} */ (get(gameState));
			const activeSlotId = state.activeSlotId;
			if (activeSlotId && Number(activeSlotId) === Number(id)) {
				console.warn('[saveSlotsManager] delete prevented for active slot:', id);
				return { ok: false, reason: 'active-slot' };
			}
		} catch (e) {
			// ignore errors reading gameState and allow delete as fallback
		}

		// Clear slot contents
		slot.payload = null;
		slot.meta = null;
		slot.ts = null;
		slot.name = `Slot ${id}`;

		// If this was lastUsed, clear lastUsed
		if (this._data.lastUsed === id) this._data.lastUsed = null;

		this._save();
		return { ok: true };
	}

	/** @param {any} id */
	exportSlot(id) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		if (!slot || !slot.payload) return { ok: false, reason: 'empty' };
		// export a JSON with meta and payload (encrypted) so it's portable
		const out = {
			exportedAt: now(),
			version: this.schemaVersion,
			slot: {
				id: slot.id,
				name: slot.name,
				mode: slot.mode,
				ts: slot.ts,
				meta: slot.meta,
				payload: slot.payload
			}
		};
		const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
		return {
			ok: true,
			blob,
			filename: `${slot.name.replace(/\s+/g, '-') || 'slot'}-${slot.id}-${slot.ts || now()}.json`
		};
	}

	/** @param {any} id @param {any} fileContent */
	importToSlot(id, fileContent) {
		this._ensureInitialized();
		const slot = this.getSlot(id);
		if (!slot) return { ok: false, reason: 'no-slot' };
		if (slot.locked) return { ok: false, reason: 'locked' };

		try {
			const parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
			const incoming = parsed.slot;
			if (!incoming || !incoming.payload) return { ok: false, reason: 'invalid-file' };

			// Basic mode check
			const state = /** @type {any} */ (get(gameState));
			if (incoming.mode === 'free' && state.mode !== 'free') {
				// reject importing free-mode saves when not in free mode
				return { ok: false, reason: 'mode-mismatch' };
			}

			// Decrypt, migrate, and re-encrypt the payload to ensure it's in the latest format
			try {
				const decrypted = parseMaybeEncrypted(incoming.payload);
				if (decrypted.data) {
					let migratedData = decrypted.data;

					// Apply migration if needed
					if (migratedData.version !== GameDataMigration.LATEST_VERSION) {
						console.log(
							'[saveSlotsManager] Migrating imported data from version:',
							migratedData.version
						);
						migratedData = GameDataMigration.migrate(migratedData);
					}

					// Migrate personality traits from old location if needed
					if (
						migratedData.character &&
						migratedData.character.personalityTraits &&
						!migratedData.personality
					) {
						console.log('[saveSlotsManager] Migrating personality traits during import');
						migratedData.personality = migratedData.character.personalityTraits;
						delete migratedData.character.personalityTraits;
					}

					// If no traitHistory exists, create one from personality totals
					if (!migratedData.traitHistory && migratedData.personality) {
						console.log(
							'[saveSlotsManager] Creating trait history from personality totals during import'
						);
						/** @type {Array<{trait: string, amount: number, source: string, sourceId: string|null, timestamp: number, description: string|null}>} */
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
							const value = migratedData.personality[trait] || 0;
							if (value > 0) {
								history.push({
									trait,
									amount: value,
									source: 'other',
									sourceId: 'import-migration',
									timestamp: Date.now(),
									description: 'Imported from save without trait history'
								});
								/** @type {keyof typeof current} */
								const traitKey = /** @type {any} */ (trait);
								current[traitKey] = value;
								breakdown[traitKey].other = value;
							}
						});

						migratedData.traitHistory = { history, current, breakdown };
					}

					// Ensure version is updated
					migratedData.version = GameDataMigration.LATEST_VERSION;

					// Re-encrypt with migrated data
					incoming.payload = stringifyPreferEncrypted(migratedData);
					console.log('[saveSlotsManager] Import migration complete');
				}
			} catch (migrateError) {
				console.error('[saveSlotsManager] Failed to migrate imported save data', migrateError);
				// Return error instead of continuing with potentially broken data
				return { ok: false, reason: 'migration-failed', error: migrateError };
			}

			slot.payload = incoming.payload;
			slot.ts = incoming.ts || now();
			slot.meta = incoming.meta || null;
			slot.name = incoming.name || slot.name;
			this._data.lastUsed = id;
			this._save();

			console.log('[saveSlotsManager] Import successful to slot:', id);
			return { ok: true };
		} catch (e) {
			console.error('importToSlot failed', e);
			// Provide more detailed error info
			try {
				if (typeof window !== 'undefined') {
					/** @type {any} */ (window)._lastImportError = {
						error: e instanceof Error ? e.message : String(e),
						stack: e instanceof Error ? e.stack : null,
						slotId: id,
						timestamp: Date.now()
					};
				}
			} catch (w) {
				/* ignore */
			}
			return { ok: false, reason: 'error', error: e };
		}
	}

	hasAnySaved() {
		this._ensureInitialized();
		return (this._data.slots || []).some(/** @param {any} s */ (s) => !!s.payload);
	}

	/**
	 * Extract personality traits from a save payload (useful for debugging or manual migration)
	 * @param {string} payload - The encrypted save payload
	 * @returns {object|null} - The personality traits object or null if not found
	 */
	extractPersonalityTraits(payload) {
		try {
			const decrypted = parseMaybeEncrypted(payload);
			if (!decrypted.data) return null;

			let data = decrypted.data;

			// Check for traits in the top-level personality field (new format)
			if (data.personality) {
				return data.personality;
			}

			// Check for traits in character.personalityTraits (old format)
			if (data.character && data.character.personalityTraits) {
				return data.character.personalityTraits;
			}

			return null;
		} catch (e) {
			console.error('Failed to extract personality traits', e);
			return null;
		}
	}

	getLastUsed() {
		this._ensureInitialized();
		return this._data.lastUsed || null;
	}

	/**
	 * Auto-save to the current character's active slot, or find an empty unlocked slot.
	 * This is the method to call for automatic saves during gameplay.
	 */
	autoSave() {
		this._ensureInitialized();
		const state = /** @type {any} */ (get(gameState));
		const activeSlotId = state.activeSlotId;

		console.log('[saveSlotsManager] autoSave called - activeSlotId:', activeSlotId);

		// If we know the active slot, save there
		if (activeSlotId) {
			const slot = this.getSlot(activeSlotId);
			if (slot && !slot.locked) {
				console.log('[saveSlotsManager] Saving to active slot:', activeSlotId);
				return this.saveToSlot(activeSlotId);
			}
		}

		// Otherwise, find the first empty unlocked slot
		const slots = this._data.slots || [];
		const emptySlot = slots.find(/** @param {any} s */ (s) => !s.locked && !s.payload);
		if (emptySlot) {
			console.log('[saveSlotsManager] Found empty slot:', emptySlot.id);
			const result = this.saveToSlot(emptySlot.id);
			if (result.ok) {
				// Update activeSlotId so future saves go here
				gameState.update((s) => ({ ...s, activeSlotId: emptySlot.id }));
				console.log('[saveSlotsManager] Set activeSlotId to:', emptySlot.id);
			}
			return result;
		}

		// No empty slots - save to the last used unlocked slot or slot 1
		const fallbackSlot = slots.find(/** @param {any} s */ (s) => !s.locked);
		if (fallbackSlot) {
			console.log('[saveSlotsManager] Using fallback slot:', fallbackSlot.id);
			const result = this.saveToSlot(fallbackSlot.id);
			if (result.ok) {
				gameState.update((s) => ({ ...s, activeSlotId: fallbackSlot.id }));
				console.log('[saveSlotsManager] Set activeSlotId to:', fallbackSlot.id);
			}
			return result;
		}
		console.error('[saveSlotsManager] No available slots!');
		return { ok: false, reason: 'no-available-slots' };
	}
}

export const saveSlotsManager = new SaveSlotsManager();
