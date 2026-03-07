// src/lib/stores/questStore.js
// @ts-nocheck

import { writable, derived } from 'svelte/store';
import { get } from 'svelte/store';
import { gameState, personalityTraits, startQuestStats, completeQuestStats, failQuestStats } from './gameState';
import { addTraitChange } from './traitHistory';
import { saveManager } from './saveManager';
import { supabase } from '$lib/supabaseClient';
import { questTemplates } from '../data/quests';
import { show, showRewards } from './toastStore';
import { getExpRequiredForLevel, getNewLevel } from '../utils/leveling';
import { getRankFromLevel, calculateDerived } from '../utils/stats';
import itemDatabase from '../data/items.json';
import skillsDb from '../data/skills.json';

// Timer to watch for expiry and mark completed deterministically
let tickHandle = null;
let _serverOffset = 0; // milliseconds to add to Date.now() to approximate server time
let _syncPromise = null;

// Active quest instance is stored under gameState.character.activeQuest
function loadActiveQuest() {
	const gs = get(gameState);
	return (gs.character && gs.character.activeQuest) || null;
}

export const activeQuest = writable(loadActiveQuest());

// If we loaded an in-progress quest from persisted gameState (app reload),
// ensure the server-time sync and the expiry tick are active so quests
// that expire while the app was closed are transitioned to 'completed'.
const _initial = loadActiveQuest();
if (_initial && _initial.status === 'in_progress') {
	// best-effort sync of server time and start the tick loop
	void syncServerTimeOnce();
	ensureTick();
}

// Additionally, inspect persisted `character.quests` for any in-progress entries
// that may have expired while the app was closed. If found, start the tick and
// immediately mark expired entries as completed so the UI and receptionist
// correctly surface them on load.
try {
	const gsInit = get(gameState) || {};
	const chInit = gsInit.character || {};
	const persisted = Array.isArray(chInit.quests) ? chInit.quests : [];
	if (persisted.length) {
		// If there are any in-progress quests, ensure we have server offset and a running tick
		const hasInProgress = persisted.some((q) => q && q.status === 'in_progress');
		if (hasInProgress) {
			void syncServerTimeOnce();
			ensureTick();
		}

		// Immediately finalize any in-progress quests whose endTime is already past
		const now = getNow();
		let changed = false;
		const updatedList = persisted.map((q) => {
			try {
				if (q && q.status === 'in_progress' && q.endTime && now >= q.endTime) {
					changed = true;
					return { ...q, status: 'completed', result: 'success' };
				}
			} catch (_e) {
				// Ignore quest processing errors
			}
			return q;
		});

		if (changed) {
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					next.character = { ...(next.character || {}), quests: updatedList };
					return next;
				});
				// Persist immediately and notify UI
				try {
					saveManager.saveGame({ auto: true });
				} catch (_e) {
					// Ignore auto-save errors
				}
				try {
					window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id: null } }));
				} catch (_e) {
					// Ignore event dispatch errors
				}
				try {
					show(`Quest(s) completed while away`, { type: 'success', duration: 5000 });
				} catch (_e) {
					// Ignore toast display errors
				}
			} catch (e) {
				/* ignore */
			}
		}
	}
} catch (e) {
	/* ignore init-time errors */
}

// Persist active quest into gameState when it changes
activeQuest.subscribe((q) => {
	gameState.update((state) => ({
		...state,
		character: {
			...(state.character || {}),
			activeQuest: q
		}
	}));
});

// Derived helpers
export const hasActiveQuest = derived([activeQuest, gameState], ([q, gs]) => {
	try {
		// If there's an in-progress activeQuest, consider it active
		if (q && q.status === 'in_progress') return true;
		// Otherwise, if the persisted character quests list contains a completed (awaiting submit)
		// or still in-progress entry, consider that as blocking new accepts until submission/abandon.
		const ch = (gs && gs.character) || {};
		const list = Array.isArray(ch.quests) ? ch.quests : [];
		return list.some((x) => x && (x.status === 'in_progress' || x.status === 'completed' || x.status === 'failed'));
	} catch (e) {
		return !!(q && q.status === 'in_progress');
	}
});

export const remainingSeconds = derived(activeQuest, (q) => {
	if (!q || !q.endTime) return 0;
	const now = getNow();
	return Math.max(0, Math.ceil((q.endTime - now) / 1000));
});

// Export a helper to re-check quests after a load operation
// (called by saveSlotsManager after restoring gameState)
export function recheckQuestsAfterLoad() {
	try {
		const gs = get(gameState) || {};
		const ch = gs.character || {};
		const persisted = Array.isArray(ch.quests) ? ch.quests : [];

		// Also reload activeQuest from the newly loaded gameState
		const newActive = (ch && ch.activeQuest) || null;
		activeQuest.set(newActive);

		console.log('[questStore] recheckQuestsAfterLoad - newActive:', newActive);

		if (!persisted.length && !newActive) return;

		// Start tick if there are in-progress quests
		const hasInProgress =
			persisted.some((q) => q && q.status === 'in_progress') ||
			(newActive && newActive.status === 'in_progress');
		if (hasInProgress) {
			void syncServerTimeOnce();
			ensureTick();
		}

		// Immediately mark expired quests as completed
		const now = getNow();
		console.log(
			'[questStore] recheckQuestsAfterLoad - now:',
			now,
			'newActive.endTime:',
			newActive?.endTime,
			'expired?',
			newActive && newActive.endTime && now >= newActive.endTime
		);
		let changed = false;
		const updatedList = persisted.map((q) => {
			try {
				if (q && q.status === 'in_progress' && q.endTime && now >= q.endTime) {
					changed = true;
					return { ...q, status: 'completed', result: 'success' };
				}
			} catch (e) {}
			return q;
		});

		if (changed) {
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					next.character = { ...(next.character || {}), quests: updatedList };
					return next;
				});
				try {
					saveManager.saveGame({ auto: true });
				} catch (e) {}
				try {
					window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id: null } }));
				} catch (e) {}
				try {
					show(`Quest(s) completed while away`, { type: 'success', duration: 5000 });
				} catch (e) {}
			} catch (e) {}
		}

		// Also check if activeQuest itself expired
		if (
			newActive &&
			newActive.status === 'in_progress' &&
			newActive.endTime &&
			now >= newActive.endTime
		) {
			console.log('[questStore] recheckQuestsAfterLoad - marking activeQuest as completed');
			const completed = { ...newActive, status: 'completed', result: 'success' };
			activeQuest.set(completed);
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					next.character = { ...(next.character || {}), activeQuest: completed };
					return next;
				});
				try {
					saveManager.saveGame({ auto: true });
				} catch (e) {}
				try {
					window.dispatchEvent(
						new CustomEvent('quest:completed', { detail: { id: newActive.id } })
					);
				} catch (e) {}
				try {
					show(
						`Quest completed: ${newActive.template?.title || newActive.templateId || newActive.id}`,
						{ type: 'success', duration: 6000 }
					);
				} catch (e) {}
			} catch (e) {}
		} else {
			console.log(
				'[questStore] recheckQuestsAfterLoad - activeQuest NOT expired or not in_progress'
			);
		}
	} catch (e) {
		console.warn('[questStore] recheckQuestsAfterLoad failed', e);
	}
}

// Timer to watch for expiry and mark completed deterministically

async function syncServerTimeOnce() {
	if (_syncPromise) return _syncPromise;

	_syncPromise = (async () => {
		try {
			console.log('[questStore] Starting time sync...');
			// Try Supabase RPC first for authoritative server time
			const { data, error } = await supabase.rpc('get_server_time');
			if (!error && data) {
				const serverMs = new Date(data).getTime();
				if (serverMs && !Number.isNaN(serverMs)) {
					_serverOffset = serverMs - Date.now();
					try {
						gameState.update((s) => ({ ...(s || {}), serverTimeOffset: _serverOffset }));
					} catch (e) {}
					console.log('[questStore] Synced time with Supabase. Offset:', _serverOffset);
					return;
				}
			} else {
				console.warn('[questStore] Supabase time sync failed:', error);
			}

			// Fallback: Try a lightweight public time API
			if (typeof fetch === 'function') {
				const res = await fetch('https://worldtimeapi.org/api/ip');
				if (res && res.ok) {
					const json = await res.json();
					// 'unixtime' is seconds since epoch, convert to ms
					const serverMs = json.unixtime ? json.unixtime * 1000 : Date.parse(json.datetime);
					if (serverMs && !Number.isNaN(serverMs)) {
						_serverOffset = serverMs - Date.now();
						try {
							gameState.update((s) => ({ ...(s || {}), serverTimeOffset: _serverOffset }));
						} catch (e) {}
					}
				}
			}
		} catch (e) {
			// Non-fatal - fall back to local clock
			console.warn('[questStore] Time sync failed', e);
		}
	})();

	return _syncPromise;
}

export function ensureServerTime() {
	return syncServerTimeOnce();
}

function getNow() {
	return Date.now() + (_serverOffset || get(gameState).serverTimeOffset || 0);
}
export function serverNow() {
	return getNow();
}
// return YYYY-MM-DD for a server-aligned timestamp
function serverDateString(nowMs) {
	const d = new Date(nowMs || getNow());
	const yyyy = d.getUTCFullYear();
	const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(d.getUTCDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}
function ensureTick() {
	if (tickHandle) return;
	tickHandle = setInterval(() => {
		const q = get(activeQuest);
		if (!q) return;
		const now = getNow();
		if (q.status === 'in_progress' && now >= q.endTime) {
			// mark complete (deterministic success)
			const updated = { ...q, status: 'completed', result: 'success' };
			activeQuest.set(updated);
			try {
				completeQuestStats(q.template);
			} catch (e) {
				console.warn('[questStore] Error updating quest stats on timer complete:', e);
			}
			// also update the character.quests entry if present so QuestsWindow reflects completion
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					const ch = { ...(next.character || {}) };
					ch.quests = (ch.quests || []).map((x) =>
						x.id === q.id ? { ...x, status: 'completed' } : x
					);
					next.character = ch;
					return next;
				});
				// Persist the completed state immediately to avoid detection races
				try {
					saveManager.saveGame({ auto: true });
				} catch (e) {}
				// Emit a global event so UI can react (auto-open quests panel / show toast)
				try {
					if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
						window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id: q.id } }));
					}
				} catch (e) {}
				// Notify the player via toast that the quest completed while they were away
				try {
					show(`Quest completed: ${q.template?.title || q.templateId || q.id}`, {
						type: 'success',
						duration: 6000
					});
				} catch (e) {}
				// If the player selected a specific reward option at accept-time, auto-submit so rewards are applied immediately
				// But skip auto-submit for quests with potion rewards to allow manual submission for roulette trigger
				try {
					const hasPotion = (function () {
						try {
							if (updated.template && updated.template.rewardOptions) {
								return updated.template.rewardOptions.some(
									(opt) =>
										opt.rewards &&
										opt.rewards.items &&
										opt.rewards.items.some(
											(item) =>
												item.id === 'potion-unknown' ||
												item.id === 'potion_of_unknown' ||
												item.id === 'potion-unknown-effects'
										)
								);
							}
							if (updated.template && updated.template.rewards && updated.template.rewards.items) {
								return updated.template.rewards.items.some(
									(item) =>
										item.id === 'potion-unknown' ||
										item.id === 'potion_of_unknown' ||
										item.id === 'potion-unknown-effects'
								);
							}
							return false;
						} catch (e) {
							return false;
						}
					})();
					if (updated && updated.chosenReward && !hasPotion) {
						// call submitQuest to apply rewards and clear state
						try {
							submitQuest();
						} catch (e) {
							/* ignore submission errors */
						}
					}
				} catch (e) {}
			} catch (e) {
				// ignore
			}
		}
	}, 1000);
}

function clearTick() {
	if (tickHandle) {
		clearInterval(tickHandle);
		tickHandle = null;
	}
}

// API
export function startQuest(templateId, chosenReward = null) {
	const tpl = questTemplates.find((t) => t.id === templateId);
	if (!tpl) throw new Error('Quest template not found: ' + templateId);
	try {
		console.debug('[questStore] startQuest called', { templateId, chosenReward });
		if (typeof window !== 'undefined') {
			try {
				window._lastStartQuest = { templateId, chosenReward, timestamp: Date.now() };
			} catch (e) {}
		}
	} catch (e) {}
	// Ensure we have an approximation of server time before creating timestamps
	void syncServerTimeOnce();

	// Normalize chosenReward early so stamina/silver deduction uses the resolved option
	let resolvedChosen = null;
	try {
		if (typeof chosenReward === 'string') {
			resolvedChosen = Array.isArray(tpl.rewardOptions)
				? tpl.rewardOptions.find((o) => o.id === chosenReward) || null
				: null;
		} else if (chosenReward && chosenReward.id) {
			resolvedChosen = Array.isArray(tpl.rewardOptions)
				? tpl.rewardOptions.find((o) => o.id === chosenReward.id) || chosenReward
				: chosenReward;
		} else {
			resolvedChosen = null;
		}
	} catch (e) {
		resolvedChosen = null;
	}

	// Prevent starting a new quest if an active quest is already in progress
	try {
		const cur = get(activeQuest);
		if (cur && cur.status === 'in_progress') {
			try {
				show('You already have an active quest.', { type: 'info', duration: 3000 });
			} catch (e) {}
			return;
		}
	} catch (e) {}

	// Check quest requirements
	try {
		const gs = get(gameState) || {};
		const pd = gs.playerData || {};
		const ch = gs.character || {};
		const reqStam =
			tpl.requirements && Number(tpl.requirements.stamina) ? Number(tpl.requirements.stamina) : 0;
		const reqSilver =
			tpl.requirements && Number(tpl.requirements.silver) ? Number(tpl.requirements.silver) : 0;
		const reqLevel =
			tpl.requirements && Number(tpl.requirements.level) ? Number(tpl.requirements.level) : 0;
		const reqRank = tpl.requirements && tpl.requirements.rank ? tpl.requirements.rank : null;
		if (reqStam > 0 && (Number(pd.stamina) || 0) < reqStam) {
			try {
				show('You do not have enough Stamina to accept this quest.', {
					type: 'info',
					duration: 4000
				});
			} catch (e) {}
			return;
		}
		if (reqSilver > 0 && (Number(pd.silver) || 0) < reqSilver) {
			try {
				show('You do not have enough Silver to accept this quest.', {
					type: 'info',
					duration: 4000
				});
			} catch (e) {}
			return;
		}
		if (reqLevel > 0 && (Number(pd.level) || 1) < reqLevel) {
			try {
				show(`You must be at least level ${reqLevel} to accept this quest.`, {
					type: 'info',
					duration: 4000
				});
			} catch (e) {}
			return;
		}
		if (reqRank) {
			const playerRank = ch.rank || getRankFromLevel(Number(pd.level) || 1);
			// Compare ranks: E < D < C < B < A < S < SS < SSS
			const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
			const playerRankIndex = rankOrder.indexOf(playerRank);
			const reqRankIndex = rankOrder.indexOf(reqRank);
			if (playerRankIndex < reqRankIndex) {
				try {
					show(`You must be at least ${reqRank} Rank to accept this quest.`, {
						type: 'info',
						duration: 4000
					});
				} catch (e) {}
				return;
			}
		}

		// Check quest prerequisites
		const requires = Array.isArray(tpl.requires) ? tpl.requires : [];
		if (requires.length > 0) {
			const completedQuestIds = new Set(
				(Array.isArray(ch.quests) ? ch.quests : [])
					.filter((q) => q.status === 'completed')
					.map((q) => q.templateId || q.id)
			);
			const missingPrereqs = requires.filter((reqId) => !completedQuestIds.has(reqId));
			if (missingPrereqs.length > 0) {
				try {
					show('You must complete prerequisite quests before accepting this quest.', {
						type: 'info',
						duration: 4000
					});
				} catch (e) {}
				return;
			}
		}
	} catch (e) {}

	// If this template is part of the 'daily' series, enforce one-per-day selection
	try {
		if (tpl && tpl.series === 'daily') {
			const gs = get(gameState) || {};
			const ch = gs.character || {};
			const last = ch.dailyQuestSelectedDate || null;
			const today = serverDateString(getNow());
			if (last && String(last) === String(today)) {
				try {
					show('You have already chosen a Daily Quest today. Come back tomorrow.', {
						type: 'info',
						duration: 4000
					});
				} catch (e) {}
				return; // prevent starting another daily today
			}
			// check stamina requirement before recording selection
			// Normalize chosenReward: if caller passed an option id or option object, resolve it to the template option
			let chosenOpt = null;
			try {
				if (typeof chosenReward === 'string') {
					chosenOpt = Array.isArray(tpl.rewardOptions)
						? tpl.rewardOptions.find((o) => o.id === chosenReward)
						: null;
				} else if (chosenReward && typeof chosenReward === 'object' && chosenReward.id) {
					chosenOpt = Array.isArray(tpl.rewardOptions)
						? tpl.rewardOptions.find((o) => o.id === chosenReward.id) || chosenReward
						: chosenReward;
				} else {
					chosenOpt = null;
				}
			} catch (e) {
				chosenOpt = null;
			}

			const pd = gs.playerData || {};
			const rewardStam =
				chosenOpt && typeof chosenOpt.stamina === 'number' ? chosenOpt.stamina : null;
			const reqStam =
				rewardStam !== null
					? rewardStam
					: tpl.requirements && Number(tpl.requirements.stamina)
						? Number(tpl.requirements.stamina)
						: 0;
			const rewardSilver =
				chosenOpt && typeof chosenOpt.silver === 'number' ? chosenOpt.silver : null;
			const reqSilver =
				rewardSilver !== null
					? rewardSilver
					: tpl.requirements && Number(tpl.requirements.silver)
						? Number(tpl.requirements.silver)
						: 0;
			if (reqStam > 0 && (Number(pd.stamina) || 0) < reqStam) {
				try {
					show('You do not have enough Stamina to accept this quest.', {
						type: 'info',
						duration: 4000
					});
				} catch (e) {}
				return;
			}
			if (reqSilver > 0 && (Number(pd.silver) || 0) < reqSilver) {
				try {
					show('You do not have enough Silver to accept this quest.', {
						type: 'info',
						duration: 4000
					});
				} catch (e) {}
				return;
			}
			// Record selection so subsequent attempts today are blocked and deduct stamina and silver immediately
			try {
				// Debug: log stamina before deduction
				try {
					const _gsBefore = get(gameState) || {};
					const _pdBefore = _gsBefore.playerData || {};
					console.debug('[questStore] startQuest DAILY - deducting stamina/silver', {
						template: tpl.id,
						reqStam,
						staminaBefore: _pdBefore.stamina || 0,
						reqSilver,
						silverBefore: _pdBefore.silver || 0
					});
				} catch (e) {}

				gameState.update((s) => {
					const next = { ...(s || {}) };
					const ch2 = { ...(next.character || {}) };
					const pd2 = { ...(next.playerData || {}) };
					pd2.stamina = Math.max(0, (pd2.stamina || 0) - reqStam);
					pd2.silver = Math.max(0, (pd2.silver || 0) - reqSilver);
					next.playerData = pd2;
					ch2.dailyQuestSelectedDate = today;
					ch2.dailyQuestSelectedId = tpl.id;
					next.character = ch2;
					return next;
				});

				try {
					const _gsAfter = get(gameState) || {};
					const _pdAfter = _gsAfter.playerData || {};
					console.debug('[questStore] startQuest DAILY - after deduction', {
						template: tpl.id,
						reqStam,
						staminaAfter: _pdAfter.stamina || 0,
						reqSilver,
						silverAfter: _pdAfter.silver || 0
					});
					try {
						if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
							window.dispatchEvent(
								new CustomEvent('debug:stamina', {
									detail: {
										reason: 'startQuest-daily',
										template: tpl.id,
										required: reqStam,
										staminaAfter: _pdAfter.stamina || 0
									}
								})
							);
						}
					} catch (e) {}
				} catch (e) {}
				try {
					saveManager.saveGame({ auto: true });
				} catch (e) {}
			} catch (e) {}
		}
	} catch (e) {}
	const now = getNow();

	// Deduct stamina and silver for non-daily quests
	try {
		const gs = get(gameState) || {};
		const pd = gs.playerData || {};
		const reqStam =
			resolvedChosen && typeof resolvedChosen.stamina === 'number'
				? resolvedChosen.stamina
				: tpl.requirements && Number(tpl.requirements.stamina)
					? Number(tpl.requirements.stamina)
					: 0;
		const reqSilver =
			resolvedChosen && typeof resolvedChosen.silver === 'number'
				? resolvedChosen.silver
				: tpl.requirements && Number(tpl.requirements.silver)
					? Number(tpl.requirements.silver)
					: 0;
		if (reqStam > 0 || reqSilver > 0) {
			// Debug: log stamina before deduction for non-daily
			try {
				const _gsBefore2 = get(gameState) || {};
				const _pdBefore2 = _gsBefore2.playerData || {};
				console.debug('[questStore] startQuest (non-daily) - deducting', {
					template: tpl.id,
					reqStam,
					staminaBefore: _pdBefore2.stamina || 0,
					reqSilver,
					silverBefore: _pdBefore2.silver || 0
				});
			} catch (e) {}

			gameState.update((s) => {
				const next = { ...(s || {}) };
				const pd2 = { ...(next.playerData || {}) };
				pd2.stamina = Math.max(0, (pd2.stamina || 0) - reqStam);
				pd2.silver = Math.max(0, (pd2.silver || 0) - reqSilver);
				next.playerData = pd2;
				return next;
			});

			try {
				const _gsAfter2 = get(gameState) || {};
				const _pdAfter2 = _gsAfter2.playerData || {};
				console.debug('[questStore] startQuest (non-daily) - after deduction', {
					template: tpl.id,
					reqStam,
					staminaAfter: _pdAfter2.stamina || 0,
					reqSilver,
					silverAfter: _pdAfter2.silver || 0
				});
				try {
					if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
						window.dispatchEvent(
							new CustomEvent('debug:stamina', {
								detail: {
									reason: 'startQuest-non-daily',
									template: tpl.id,
									required: reqStam,
									staminaAfter: _pdAfter2.stamina || 0
								}
							})
						);
					}
				} catch (e) {}
			} catch (e) {}
		}
	} catch (e) {}

	// `resolvedChosen` was already computed earlier to ensure deductions use option-level values

	// prefer option-level durationSeconds, then template.durationSeconds
	const durationSec =
		resolvedChosen && typeof resolvedChosen.durationSeconds === 'number'
			? resolvedChosen.durationSeconds
			: tpl.durationSeconds || 0;

	const instance = {
		id: tpl.id + '-' + now,
		templateId: tpl.id,
		status: 'in_progress',
		startTime: now,
		// store server-aligned absolute endTime using chosen duration
		endTime: now + durationSec * 1000,
		result: null,
		template: tpl,
		// mark daily quests as non-abandonable
		nonAbandonable: tpl.series === 'daily',
		// record chosen reward (normalize shape to { id, label, rewards, durationSeconds, stamina, hiddenTrait })
		chosenReward: (function () {
			try {
				const o = resolvedChosen;
				if (!o) return null;
				// support old key names (value -> rewards, duration -> durationSeconds)
				return {
					id: o.id || null,
					label: o.label || null,
					rewards: o.rewards || o.value || o.reward || null,
					durationSeconds:
						typeof o.durationSeconds === 'number'
							? o.durationSeconds
							: typeof o.duration === 'number'
								? o.duration
								: undefined,
					stamina:
						typeof o.stamina === 'number'
							? o.stamina
							: typeof o.stam === 'number'
								? o.stam
								: undefined,
					hiddenTrait: o.hiddenTrait || o.hidden || null
				};
			} catch (e) {
				return null;
			}
		})()
	};
	activeQuest.set(instance);
	try {
		startQuestStats(tpl);
	} catch (e) {
		console.warn('[questStore] Error updating quest stats on start:', e);
	}
	// mirror into character.quests so the legacy QuestsWindow shows it
	try {
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			const list = Array.isArray(ch.quests) ? ch.quests.slice() : [];
			list.push({
				id: instance.id,
				templateId: instance.templateId,
				title: tpl.title,
				description: tpl.description,
				chosenReward: instance.chosenReward,
				startTime: instance.startTime,
				endTime: instance.endTime,
				status: instance.status
			});
			ch.quests = list;
			next.character = ch;
			return next;
		});
		// Autosave to prevent tampering
		try {
			saveManager.saveGame({ auto: true });
		} catch (e) {}
	} catch (e) {}
	ensureTick();
}

export function abandonQuest() {
	// mark failed and clear
	const q = get(activeQuest);
	if (!q) return;
	// prevent abandoning non-abandonable quests (daily series)
	try {
		if (q.nonAbandonable) {
			try {
				show('This quest cannot be abandoned.', { type: 'info', duration: 3000 });
			} catch (e) {}
			return;
		}
	} catch (e) {}
	try {
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			ch.quests = (ch.quests || []).filter((x) => x.id !== q.id);
			next.character = ch;
			return next;
		});
	} catch (e) {}
	activeQuest.set(null);

	// Autosave state after abandoning
	try {
		saveManager.saveGame({ auto: true });
	} catch (e) {}

	// emit a global event so any lingering quest UI can react and close
	try {
		if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
			window.dispatchEvent(new CustomEvent('quest:submitted', { detail: { id: q.id } }));
		}
	} catch (e) {
		/* ignore */
	}
}

/**
 * Handle player death that occurs during a quest.
 * Rules:
 * - If player dies while a quest is active, the quest is marked failed (no rewards, no cooldown entry)
 * - The player loses all HP and SP except 1 (pd.hp = 1, pd.sp = 1) by default
 * - If the player's character has `rogue_stealth` and the skill is not on cooldown, consume the skill
 *   (start its cooldown) and instead restore HP/SP to full (stamina unchanged). The quest still fails.
 * - Persist state and emit a global event `quest:failed` with details
 */
export function handlePlayerDeathDuringQuest() {
	try {
		const gs = get(gameState) || {};
		const ch = gs.character || {};
		const pd = gs.playerData || {};

		const q = get(activeQuest);

		// Default: player reduced to 1 HP/SP
		let revivedToFull = false;

		// Check for rogue stealth usage
		try {
			const skillId = 'rogue_stealth';
			const hasSkill =
				Array.isArray(ch.skills) &&
				ch.skills.some((s) => (typeof s === 'string' ? s === skillId : s && s.id === skillId));
			if (hasSkill) {
				// determine last used timestamp map location (character.skillCooldowns)
				const cooldowns =
					ch.skillCooldowns && typeof ch.skillCooldowns === 'object'
						? { ...ch.skillCooldowns }
						: {};
				const lastUsed = cooldowns[skillId] || 0;
				const meta = skillsDb.find((x) => x.id === skillId) || null;
				const cdSec =
					meta && typeof meta.cooldownSeconds === 'number' ? meta.cooldownSeconds : null;
				const now = Date.now();
				const available = cdSec == null ? true : now - (lastUsed || 0) >= cdSec * 1000;
				if (available) {
					// consume the stealth: set lastUsed and restore HP/SP to full
					cooldowns[skillId] = now;
					gameState.update((s) => ({
						...(s || {}),
						character: { ...(s.character || {}), skillCooldowns: cooldowns }
					}));
					// recalc derived to ensure maxHp/maxSp present
					try {
						const derived = calculateDerived(
							ch.stats || {},
							ch.class,
							(gs.playerData && gs.playerData.level) || 1,
							ch.equipment || {},
							{ skills: ch.skills || [] }
						);
						pd.hp = derived.maxHp || pd.maxHp || pd.hp || 1;
						pd.sp = derived.maxSp || pd.maxSp || pd.sp || 1;
					} catch (e) {
						// fallback
						pd.hp = pd.maxHp || pd.hp || 1;
						pd.sp = pd.maxSp || pd.sp || 1;
					}
					revivedToFull = true;
				}
			}
		} catch (e) {
			// ignore skill-check errors
		}

		if (!revivedToFull) {
			pd.hp = 1;
			pd.sp = 1;
		}

		// Update playerData in state
		gameState.update((s) => ({
			...(s || {}),
			playerData: { ...(s.playerData || {}), hp: pd.hp, sp: pd.sp }
		}));

		// If there is an active quest in progress, mark it as failed
		if (q && q.status === 'in_progress') {
			const failed = { ...q, status: 'completed', result: 'failed' };
			activeQuest.set(failed);
			try {
				failQuestStats(q.template);
			} catch (e) {
				console.warn('[questStore] Error updating quest stats on failure:', e);
			}
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					const ch2 = { ...(next.character || {}) };
					// replace or append in character.quests for UI history
					const list = Array.isArray(ch2.quests) ? ch2.quests.slice() : [];
					const idx = list.findIndex((x) => x && x.id === q.id);
					const persisted = {
						id: failed.id,
						templateId: failed.templateId,
						title: failed.template?.title || failed.templateId || failed.id,
						description: failed.template?.description || failed.template?.description || '',
						chosenReward: failed.chosenReward || null,
						startTime: failed.startTime,
						endTime: failed.endTime,
						status: failed.status,
						result: failed.result
					};
					if (idx >= 0) list[idx] = persisted;
					else list.push(persisted);
					ch2.quests = list;
					next.character = ch2;
					return next;
				});
				// Persist immediately
				try {
					saveManager.saveGame({ auto: true });
				} catch (e) {}
				// Emit global event
				try {
					if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function')
						window.dispatchEvent(
							new CustomEvent('quest:failed', { detail: { id: q.id, stealthUsed: revivedToFull } })
						);
				} catch (e) {}
				// Notify via toast
				try {
					show('Your quest failed.', { type: 'info', duration: 4000 });
				} catch (e) {}
			} catch (e) {
				console.warn(
					'[questStore] handlePlayerDeathDuringQuest failed to persist quest failure',
					e
				);
			}
		}

		return { ok: true, stealthUsed: revivedToFull };
	} catch (e) {
		console.warn('[questStore] handlePlayerDeathDuringQuest error', e);
		return { ok: false, error: e };
	}
}

// Dev helper: clear daily quest selection so testers can re-pick daily quests
export function resetDailySelection() {
	try {
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			// remove daily selection and completion markers
			delete ch.dailyQuestSelectedDate;
			delete ch.dailyQuestSelectedId;
			delete ch.dailyQuestCompletedDate;
			next.character = ch;
			return next;
		});
		try {
			saveManager.saveGame({ auto: true });
		} catch (e) {}
		try {
			show('Daily quest selection cleared (dev)', { type: 'info', duration: 3000 });
		} catch (e) {}
	} catch (e) {
		/* ignore */
	}
}

// Dev helper: force complete the active quest instantly
export function forceCompleteQuest() {
	const q = get(activeQuest);
	if (!q || q.status !== 'in_progress') {
		console.log('[questStore] No active quest to force complete');
		return;
	}
	const updated = { ...q, status: 'completed', result: 'success' };
	activeQuest.set(updated);
	try {
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			ch.quests = (ch.quests || []).map((x) => (x.id === q.id ? { ...x, status: 'completed' } : x));
			next.character = ch;
			return next;
		});
		try {
			saveManager.saveGame({ auto: true });
		} catch (e) {}
		try {
			if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
				window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id: q.id } }));
			}
		} catch (e) {}
		try {
			show(`Quest completed: ${q.template?.title || q.templateId || q.id}`, {
				type: 'success',
				duration: 6000
			});
		} catch (e) {}
		try {
			if (updated && updated.chosenReward) {
				submitQuest();
			}
		} catch (e) {}
	} catch (e) {
		console.error('[questStore] Error in forceCompleteQuest', e);
	}
}

if (typeof window !== 'undefined') {
	// expose for quick console access during development/testing
	try {
		window.resetDailySelection = resetDailySelection;
		window.forceCompleteQuest = forceCompleteQuest;
	} catch (e) {}
}

export function submitQuest() {
	// Try to use the active quest first
	let q = get(activeQuest);
	console.debug('[questStore] submitQuest called, activeQuest:', q);

	// If there's no active quest or it isn't the completed instance (possible after reload),
	// try to find a completed quest in persisted character.quests and treat that as the
	// submission target. This makes submission resilient when the app was closed and the
	// completion happened while offline/away.
	if (!q || q.status !== 'completed' || q.result !== 'success') {
		try {
			const gs = get(gameState) || {};
			const ch = gs.character || {};
			const list = Array.isArray(ch.quests) ? ch.quests : [];
			// pick the first completed quest (there should normally be at most one active/finished)
			const completed = list.find((x) => x.status === 'completed');
			if (completed) {
				// Build a lightweight quest instance from the persisted entry so we can reuse reward logic
				const tpl = questTemplates.find((t) => t.id === completed.templateId) || null;
				q = {
					id: completed.id,
					templateId: completed.templateId,
					status: completed.status,
					startTime: completed.startTime,
					endTime: completed.endTime,
					result: completed.result || 'success',
					template: tpl || { rewards: completed.rewards },
					chosenReward: completed.chosenReward || null
				};
				// Also set this into the activeQuest store so other codepaths can see it
				try {
					activeQuest.set(q);
				} catch (e) {}
			}
		} catch (e) {
			// fall through
		}
	}

	if (!q) return { ok: false, reason: 'no-active-quest' };
	// Accept completed quests even if result is missing (tolerate older save shapes)
	if (q.status !== 'completed' || (typeof q.result !== 'undefined' && q.result !== 'success')) {
		console.warn('[questStore] submitQuest: quest not completable', q);
		try {
			if (typeof window !== 'undefined') {
				try {
					window._lastQuestSubmit = { reason: 'not-completable', quest: q, timestamp: Date.now() };
				} catch (w) {}
			}
		} catch (w) {}
		return { ok: false, reason: 'not-completable' };
	}

	// grant rewards to gameState.playerData
	// Determine the reward payload: chosenReward.rewards (preferred) or template.rewards or legacy shapes
	let rewardPayload = null;
	try {
		if (q && q.chosenReward) {
			rewardPayload = q.chosenReward.rewards ? q.chosenReward.rewards : q.chosenReward;
		} else if (q.template) {
			rewardPayload =
				q.template.rewards ||
				(Array.isArray(q.template.rewardOptions) &&
					q.template.rewardOptions[0] &&
					(q.template.rewardOptions[0].rewards || q.template.rewardOptions[0].value)) ||
				null;
		}
	} catch (e) {
		rewardPayload = null;
	}
	if (rewardPayload) {
		try {
			gameState.update((s) => {
				const pd = { ...(s.playerData || {}) };
				pd.exp = (pd.exp || 0) + (rewardPayload.exp || 0);
				pd.silver = (pd.silver || 0) + (rewardPayload.silver || 0);
				pd.gold = (pd.gold || 0) + (rewardPayload.gold || 0);
				pd.diamonds = (pd.diamonds || 0) + (rewardPayload.diamonds || 0);
				return { ...s, playerData: pd };
			});
		} catch (e) {
			/* ignore */
		}

		// Show reward toast
		try {
			showRewards(rewardPayload, { type: 'success', duration: 5000 });
		} catch (e) {
			console.error('[questStore] Error showing rewards toast:', e);
		}

		// Check for random rewards
		try {
			if (q.template && q.template.randomReward) {
				const randomReward = q.template.randomReward;
				// Parse the random reward string: "30% chance for a Random E Rank Equipment Box"
				const chanceMatch = randomReward.match(/(\d+)% chance/);
				if (chanceMatch) {
					const chance = parseInt(chanceMatch[1]);
					const roll = Math.random() * 100;
					if (roll < chance) {
						// Extract the item name from the random reward string
						const itemMatch = randomReward.match(/for a (.+)$/);
						if (itemMatch) {
							const itemName = itemMatch[1];
							const itemId = itemName.toLowerCase().replace(/\s+/g, '-');

							// Add the random reward item to character inventory
							gameState.update((s) => {
								const ch = { ...(s.character || {}) };
								if (!Array.isArray(ch.inventory)) ch.inventory = [];

								// Determine box image based on chance percentage
								let boxImage = '/Images/box-e1.png'; // universal random box

								// Check if item already exists in inventory
								const existingItem = ch.inventory.find((item) => item.id === itemId);
								if (existingItem) {
									existingItem.qty = (existingItem.qty || 1) + 1;
								} else {
									ch.inventory.push({
										id: itemId,
										name: itemName,
										qty: 1,
										type: 'box',
										icon: boxImage,
										rarity: 'common',
										randomRewards: [
											{ item: 'e-rank-physical-weapon', chance: 20 },
											{ item: 'e-rank-magic-weapon', chance: 20 },
											{ item: 'e-rank-heavy-armor', chance: 20 },
											{ item: 'e-rank-medium-armor', chance: 20 },
											{ item: 'e-rank-magic-armor', chance: 20 }
										]
									});
								}
								return { ...s, character: ch };
							});

							try {
								show(`Random reward! You received: ${itemName}`, {
									type: 'success',
									duration: 4000
								});
							} catch (e) {}
						}
					}
				}
			}
		} catch (e) {
			/* ignore random reward errors */
		}

		// Check for leveling up after exp gain
		try {
			const gs = get(gameState);
			const pd = gs.playerData || {};
			const currentExp = pd.exp || 0;
			const currentLevel = pd.level || 1;
			const newLevel = getNewLevel(currentExp, currentLevel);

			if (newLevel > currentLevel) {
				// Level up!
				const levelsGained = newLevel - currentLevel;
				const statPointsGained = levelsGained * 6; // 6 stat points per level

				gameState.update((s) => {
					const pd2 = { ...(s.playerData || {}) };
					const ch2 = { ...(s.character || {}) };
					pd2.level = newLevel;
					pd2.maxExp = getExpRequiredForLevel(newLevel + 1);
					// Award stat points for leveling up
					ch2.unallocatedStatPoints = (ch2.unallocatedStatPoints || 0) + statPointsGained;
					// TODO: Maybe restore HP/SP on level up?
					return { ...s, playerData: pd2, character: ch2 };
				});
				try {
					show(`Level up! You are now level ${newLevel}! (+${statPointsGained} stat points)`, {
						type: 'success',
						duration: 5000
					});
				} catch (e) {}
			}
		} catch (e) {
			/* ignore leveling errors */
		}
	}

	// If chosenReward has a hiddenTrait, increment the personality trait
	try {
		let trait = null;
		let questId = q.templateId || q.id || 'unknown';
		if (q.chosenReward && q.chosenReward.hiddenTrait) {
			trait = q.chosenReward.hiddenTrait;
		} else if (q.template && q.template.hiddenTrait) {
			trait = q.template.hiddenTrait;
		}
		if (trait) {
			// Update the personalityTraits store
			personalityTraits.update((traits) => {
				const updated = { ...(traits || {}) };
				updated[trait] = (updated[trait] || 0) + 1;
				return updated;
			});
			// Also record in trait history for tracking
			addTraitChange(trait, 1, 'quest', {
				sourceId: questId,
				description: `Completed quest: ${q.template?.title || questId}`
			});
			console.log(`[questStore] Awarded trait ${trait} from quest ${questId}`);
		}
	} catch (e) {
		console.error('[questStore] Error awarding trait:', e);
	}

	// If template grants item rewards, add them to the character inventory
	try {
		const items =
			rewardPayload && Array.isArray(rewardPayload.items)
				? rewardPayload.items
				: q.template && q.template.rewards && Array.isArray(q.template.rewards.items)
					? q.template.rewards.items
					: [];
		if (items && items.length) {
			gameState.update((s) => {
				const next = { ...(s || {}) };
				const ch = { ...(next.character || {}) };
				const inv = Array.isArray(ch.inventory) ? ch.inventory.slice() : [];
				for (const it of items) {
					if (!it || !it.id) continue;
					const idx = inv.findIndex((x) => x.id === it.id);
					if (idx === -1) inv.push({ id: it.id, name: it.name || it.id, qty: it.qty || 1 });
					else inv[idx].qty = (inv[idx].qty || 0) + (it.qty || 1);
				}
				ch.inventory = inv;
				next.character = ch;
				return next;
			});

			// If potion chosen, trigger roulette/spin window so the UI can show the potion result.
			// NOTE: hidden-trait increments are already handled earlier via chosenReward.hiddenTrait.
			try {
				const potionFound = items.some(
					(it) =>
						it &&
						(it.id === 'potion-unknown' ||
							it.id === 'potion_of_unknown' ||
							it.id === 'potion-unknown-effects')
				);
				if (potionFound) {
					try {
						// Show a toast so the player knows a potion was awarded even if the roulette UI
						// hasn't mounted yet (helps when auto-complete happens while away).
						try {
							show('A mysterious potion was awarded — open the roulette to spin for effects.', {
								type: 'info',
								duration: 6000
							});
						} catch (e) {}
					} catch (e) {}
					try {
						if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
							// dispatch the event on a short timeout to increase chance the UI listener is present
							setTimeout(() => {
								try {
									window.dispatchEvent(
										new CustomEvent('potion:roulette', { detail: { questId: q.id, items } })
									);
								} catch (e) {}
							}, 100);
						}
					} catch (e) {}
				}
			} catch (e) {}
		}
	} catch (e) {
		/* ignore reward delivery errors */
	}

	// Track daily quest completion
	try {
		const tpl = q.template || questTemplates.find((t) => t.id === q.templateId);
		if (tpl && tpl.series === 'daily') {
			const today = serverDateString(getNow());
			gameState.update((s) => {
				const next = { ...(s || {}) };
				const ch = { ...(next.character || {}) };
				ch.dailyQuestCompletedDate = today;
				next.character = ch;
				return next;
			});
		}
	} catch (e) {}

	// Track completed quest for prerequisite checking
	try {
		const questId = q.templateId || q.id;
		const now = getNow();
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			ch.questsCompleted = ch.questsCompleted || {};
			ch.questsCompleted[questId] = now;

			// Chain reset: if completing the last quest in a chain, reset the entire chain
			const chains = {
				E307: ['E103', 'E207', 'E208', 'E307'],
				E310: ['E204', 'E209', 'E210', 'E309', 'E310'],
				E302: ['E201', 'E301', 'E302']
			};
			if (chains[questId]) {
				chains[questId].forEach((id) => delete ch.questsCompleted[id]);
			}

			next.character = ch;
			return next;
		});
	} catch (e) {}

	// remove from character quests list and clear active quest
	try {
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const ch = { ...(next.character || {}) };
			ch.quests = (ch.quests || []).filter((x) => x.id !== q.id);
			// If the persisted activeQuest references this id, clear it too
			if (ch.activeQuest && ch.activeQuest.id === q.id) {
				ch.activeQuest = null;
			}
			next.character = ch;
			return next;
		});
	} catch (e) {}
	// Clear the store's active quest if it matches
	try {
		const cur = get(activeQuest);
		if (cur && cur.id === q.id) activeQuest.set(null);
	} catch (e) {}

	// Autosave to persist rewarded state
	try {
		saveManager.saveGame({ auto: true });
	} catch (e) {}

	// emit a global submitted event for UIs that listen for it
	try {
		if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
			window.dispatchEvent(new CustomEvent('quest:submitted', { detail: { id: q.id } }));
		}
	} catch (e) {}

	return { ok: true };
}

// Expose the store interface and functions
export default {
	subscribe: activeQuest.subscribe,
	startQuest,
	abandonQuest,
	handlePlayerDeathDuringQuest,
	submitQuest,
	hasActiveQuest,
	remainingSeconds
};
