// src/lib/stores/regeneration.js
// @ts-nocheck
import { get } from 'svelte/store';
import { gameState } from './gameState';
import { calculateDerived } from '../utils/stats';

// Regeneration rules
const STAMINA_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes per 1 stamina
const HP_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes per 1 HP (base)
const SP_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes per 1 SP (base)
const TICK_MS = 1 * 1000; // run every 1s so regeneration behaves in real-time (more precise expiry checks)

let _handle = null;
let _started = false;
// throttle autosave to avoid saving every tick when only timestamps change
const SAVE_THROTTLE_MS = 60 * 1000; // 1 minute
let _lastSaveMs = 0;

function _now(gs) {
	// honor serverTimeOffset if present in gameState
	try {
		return Date.now() + ((gs && gs.serverTimeOffset) || 0);
	} catch (e) {
		return Date.now();
	}
}

function _ensureInitTimestamps(ch, now) {
	if (!ch.regen) ch.regen = {};
	if (!ch.regen.lastStaminaAt) ch.regen.lastStaminaAt = now;
	if (!ch.regen.lastHpAt) ch.regen.lastHpAt = now;
	if (!ch.regen.lastSpAt) ch.regen.lastSpAt = now;
}

function tick() {
	try {
		const gs = get(gameState);
		if (!gs) return;
		const now = _now(gs);
		const pd = (gs.playerData = gs.playerData || {});
		const ch = (gs.character = gs.character || {});
		_ensureInitTimestamps(ch, now);

		const activeQuest = !!(ch.activeQuest && ch.activeQuest.status === 'in_progress');

		let didChange = false;
		let statChanged = false; // true when hp/sp/stamina numeric value actually changes

		// If a quest is active, pause regeneration and reset last timestamps to now so
		// we do not accumulate time while the quest runs. When the quest completes,
		// regen will resume from that completion time.
		if (activeQuest) {
			// Pause regen while a quest is running - reset internal timers so time does not
			// accumulate while the player is on a quest. Do NOT persist this immediately to
			// avoid frequent autosaves; timestamps are memory-only until a stat actually
			// changes or the save throttle triggers.
			ch.regen.lastStaminaAt = now;
			ch.regen.lastHpAt = now;
			ch.regen.lastSpAt = now;
		} else {
			// Calculate equipment bonuses for HP/SP regen
			let hpRegenBonus = 0;
			let spRegenBonus = 0;
			try {
				const derivedStats = calculateDerived(
					ch.stats || {},
					ch.class,
					gs.playerData?.level || 1,
					ch.equipment || {},
					{ skills: ch.skills || [] }
				);
				hpRegenBonus = derivedStats.hpRegen || 0; // HP per 6 minutes
				spRegenBonus = derivedStats.spRegen || 0; // SP per 6 minutes
			} catch (e) {
				// If calculation fails, continue with base regen
			}

			// Stamina
			const maxStam = Number(pd.maxStamina || 0);
			const curStam = Number(pd.stamina || 0);
			if (curStam < maxStam) {
				const last = ch.regen.lastStaminaAt || now;
				const delta = now - last;
				const inc = Math.floor(delta / STAMINA_INTERVAL_MS);
				if (inc > 0) {
					const add = Math.min(inc, maxStam - curStam);
					pd.stamina = (pd.stamina || 0) + add;
					ch.regen.lastStaminaAt = last + inc * STAMINA_INTERVAL_MS;
					didChange = true;
					statChanged = true;
				}
			} else {
				// pause regen for stamina while full
				// don't persist timestamp-only resets every tick; just update in-memory
				ch.regen.lastStaminaAt = now;
			}

			// HP - with equipment bonus
			const maxHp = Number(pd.maxHp || 0);
			const curHp = Number(pd.hp || 0);
			if (curHp < maxHp) {
				const last = ch.regen.lastHpAt || now;
				const delta = now - last;
				const baseInc = Math.floor(delta / HP_INTERVAL_MS);
				if (baseInc > 0) {
					// Base regen: 1 HP per 6 minutes + equipment bonus
					const totalRegen = baseInc * (1 + hpRegenBonus);
					const add = Math.min(Math.floor(totalRegen), maxHp - curHp);
					pd.hp = (pd.hp || 0) + add;
					ch.regen.lastHpAt = last + baseInc * HP_INTERVAL_MS;
					didChange = true;
					statChanged = true;
				}
			} else {
				ch.regen.lastHpAt = now;
			}

			// SP - with equipment bonus
			const maxSp = Number(pd.maxSp || 0);
			const curSp = Number(pd.sp || 0);
			if (curSp < maxSp) {
				const last = ch.regen.lastSpAt || now;
				const delta = now - last;
				const baseInc = Math.floor(delta / SP_INTERVAL_MS);
				if (baseInc > 0) {
					// Base regen: 1 SP per 6 minutes + equipment bonus
					const totalRegen = baseInc * (1 + spRegenBonus);
					const add = Math.min(Math.floor(totalRegen), maxSp - curSp);
					pd.sp = (pd.sp || 0) + add;
					ch.regen.lastSpAt = last + baseInc * SP_INTERVAL_MS;
					didChange = true;
					statChanged = true;
				}
			} else {
				ch.regen.lastSpAt = now;
			}
		}
		// Only persist when numeric stats actually changed, or when the save throttle allows it.
		if (didChange) {
			try {
				// update gameState so UI reacts to the new values
				gameState.update(() => gs);
			} catch (e) {
				// ignore
			}

			// Background autosave disabled: do not persist from regen to avoid frequent writes.
			// Update the last-save timestamp so we don't repeatedly attempt saves elsewhere.
			const nowMs = Date.now();
			if (statChanged || nowMs - _lastSaveMs >= SAVE_THROTTLE_MS) {
				_lastSaveMs = nowMs;
			}
		}
	} catch (e) {
		// non-fatal
		console.warn('regen tick failed', e);
	}
}

export function startRegeneration() {
	if (_started) return;
	_started = true;
	// run an immediate tick so short-term increments apply on load
	tick();
	_handle = setInterval(tick, TICK_MS);
}

export function stopRegeneration() {
	if (_handle) clearInterval(_handle);
	_handle = null;
	_started = false;
}

// Start automatically when module is loaded
startRegeneration();

export default {
	startRegeneration,
	stopRegeneration
};
