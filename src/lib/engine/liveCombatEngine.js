import { get } from 'svelte/store';
import { gameState } from '$lib/stores/gameState';
import { activeQuest, serverNow } from '$lib/stores/questStore';
import { saveManager } from '$lib/stores/saveManager';
import { monsterBook } from '$lib/data/monsters';
import { questEnemyMap } from '$lib/data/questEnemyMap.js';
import skillsDb from '$lib/data/skills.json';
import { calculateDerived } from '$lib/utils/stats';
import { createCombatState, processTick } from '$lib/engine/combatCore.js';

let _active = false;
let _currentSession = null;

// Helper: generate E-rank crystal fragment drops for a defeated monster
function generateEFragmentsForMonster(monster) {
try {
if (!monster || !monster.id) return 0;
if (monster.loot) {
const base = monster.loot.baseFragments || 0;
const chance = monster.loot.extraFragmentChance || 0;
return base + (Math.random() < chance ? 1 : 0);
}
return 0;
} catch (e) {
return 0;
}
}

function clamp(v, min = 0, max = Infinity) {
return Math.max(min, Math.min(max, v));
}

function getEnemyListForQuest(templateId) {
const list = (questEnemyMap && questEnemyMap[templateId]) || null;
if (Array.isArray(list) && list.length) return list;
return [{ id: 'goblin-grunt', count: 1 }];
}

const dynamicSpawnRules = {
E201: { lackey: 'goblin-grunt', boss: 'hobgoblin-enforcer', solo: false },
E202: { lackey: 'sprotting', boss: 'barkblight-treant', solo: false },
E203: { lackey: 'giant-cave-bat', boss: 'cave-fisher', solo: false },
E204: { boss: 'young-rocsdale-bear', solo: true },
E205: { lackey: 'swamp-viper', boss: 'giant-leech', solo: false },
E206: { lackey: 'swamp-viper', boss: 'bog-wisp', solo: false },
E207: { lackey: 'skeleton-warrior', boss: 'ghoul', solo: false },
E208: { lackey: 'skeleton-warrior', boss: 'geist', solo: false },
E209: { boss: 'peryton', solo: true },
E210: { lackey: 'harpy-scout', boss: 'harpy-scout', solo: false }
};

function buildAttackerFromState() {
try {
const gs = get(gameState) || {};
const character = gs.character || {};
const pd = gs.playerData || {};
const equipment = character.equipment || {};
const classId = character.class || null;

let derived = {};
try {
derived = calculateDerived(character.stats || {}, classId, pd.level || 1, equipment, {
skills: character.skills || []
}) || {};
} catch (e) {
derived = {};
}

const hp = Number(pd.hp || pd.maxHp || derived.maxHp || 100);
const maxHp = Number(pd.maxHp || derived.maxHp || hp || 100);
const sp = Number(pd.sp || pd.maxSp || derived.maxSp || 0);
const maxSp = Number(pd.maxSp || derived.maxSp || sp);

const combatAtkSpd = Number(derived.combatAtkSpd || derived.atkSpd || 1);
const attackIntervalMs = Math.max(100, Math.round(1000 / (combatAtkSpd || 1)));

return {
name: (character && character.name) || 'Player',
stats: {
hp,
maxHp,
dps: Number(derived.dps || 0),
acc: Number(derived.accuracy || 0),
eva: Number(derived.evasion || 0),
phyDef: Number(derived.pDef || 0),
magDef: Number(derived.mRes || 0),
cr: Number(derived.critical || 0),
sp,
maxSp,
attackIntervalMs
},
			skills: character.skills || [],
			skillConfig: character.skillConfig || {},
			activeBuffs: (() => {
				const buffs = character.activeBuffs || {};
				const now = (typeof serverNow === 'function' ? serverNow() : Date.now());
				const clean = {};
				for (const k in buffs) {
					if (buffs[k].expiresAt > now) clean[k] = buffs[k];
				}
				return clean;
			})(),
			skillCooldowns: character.skillCooldowns || {},
			alexiChosenElement: character.alexiChosenElement || null
};
} catch (e) {
console.warn('[liveCombatEngine] buildAttackerFromState failed', e);
return { name: 'Player', stats: { hp: 1, dps: 1, acc: 0, eva: 0, phyDef: 0, magDef: 0, cr: 0, sp: 0, attackIntervalMs: 1000 }, skills: [] };
}
}

// --- The New Live Engine ---

function applyOps(ops) {
if (!ops || !ops.length) return;

gameState.update(s => {
const next = { ...s };
next.playerData = { ...next.playerData };
next.character = { ...next.character };

ops.forEach(op => {
// Only apply operations targeting the player (attacker)
// The monster state is transient in the combat core state
if (op.target === 'attacker') {
if (op.type === 'MODIFY_STAT') {
if (op.stat === 'hp') {
const cur = next.playerData.hp || 0;
const max = next.playerData.maxHp || cur;
next.playerData.hp = clamp(cur + op.value, 0, max);
}
if (op.stat === 'sp') {
const cur = next.playerData.sp || 0;
const max = next.playerData.maxSp || cur;
next.playerData.sp = clamp(cur + op.value, 0, max);
}
}
if (op.type === 'ADD_BUFF') {
if (!next.character.activeBuffs) next.character.activeBuffs = {};
next.character.activeBuffs[op.buff.id] = op.buff;
}
if (op.type === 'REMOVE_BUFF') {
if (next.character.activeBuffs) delete next.character.activeBuffs[op.id];
}
if (op.type === 'SET_COOLDOWN') {
if (!next.character.skillCooldowns) next.character.skillCooldowns = {};
Object.assign(next.character.skillCooldowns, op.cooldowns);
}
}
});
return next;
});
}

function dispatchEvents(events) {
if (!events || !events.length) return;
if (typeof window !== 'undefined') {
events.forEach(ev => {
window.dispatchEvent(new CustomEvent('combat:log', { detail: ev }));
});
}
}

async function runEncounter(attacker, defender, options = {}) {
	return new Promise((resolve, reject) => {
		const state = createCombatState(attacker, defender, options);
		let cancelled = false;
		let timeBudget = options.catchUpBudget || 0;

		// Store session control
		_currentSession = {
			cancel: () => { cancelled = true; }
		};

		const processOne = (isCatchUp = false) => {
			const { events, ops } = processTick(state);
			applyOps(ops);
			if (isCatchUp && events) {
				events.forEach(e => e.isCatchUp = true);
			}
			dispatchEvents(events);
			return state.finished;
		};

		const loop = async () => {
			if (cancelled || !_active) {
				resolve({ finished: false, cancelled: true });
				return;
			}

			// Fast Forward Phase
			let ticksProcessed = 0;
			// Increase chunk size to speed up catch-up
			while (state.simTime < timeBudget && !state.finished && ticksProcessed < 5000) {
				if (processOne(true)) break;
				ticksProcessed++;
			}

			if (state.finished) {
				resolve({ finished: true, winner: state.winner, elapsedSimTime: state.simTime });
				return;
			}

			// If we are still behind budget but hit the chunk limit, schedule immediate next loop
			if (state.simTime < timeBudget) {
				setTimeout(loop, 0);
				return;
			}

			// Real Time Phase
			// Ensure we don't get stuck with 0 delay if nextEventTime is same as simTime
			const nextEventTime = Math.max(state.simTime + 100, Math.min(state.nextAtk, state.nextDef));
			const waitMs = Math.max(0, nextEventTime - state.simTime);
			const delay = Math.max(100, waitMs); 
			
			setTimeout(() => {
				if (cancelled || !_active) return;
				processOne(false);
				loop();
			}, delay / (options.playbackSpeed || 1));
		};

		// Start loop
		loop();
	});
}

export async function startForActiveQuest(templateId, options = {}) {
if (_active) return { started: false, reason: 'already-active' };
_active = true;

console.log('[liveCombatEngine] startForActiveQuest', templateId, options);

if (options && typeof options.initialDelayMs === 'number' && options.initialDelayMs > 0) {
await new Promise((res) => setTimeout(res, options.initialDelayMs));
if (!_active) return { started: false, reason: 'cancelled' };
}

	let totalCatchUp = options.catchUpTimeMs || 0;
	// If we have catch-up time, we must ensure we don't double-dip if the user reloads again immediately.
	// However, we only update the timestamp after a successful encounter.
	// If the catch-up is huge, we might want to checkpoint periodically.

	let encounterIndex = 0;
const currentProgress = get(activeQuest)?.progress || 0;

// Safety: If this is a fresh quest (progress 0), ignore any large catch-up time.
// This prevents "instant completion" bugs if timestamps are desynced.
// if (currentProgress === 0 && totalCatchUp > 10000) {
// 	console.warn('[liveCombatEngine] Large catch-up (' + totalCatchUp + 'ms) detected for fresh quest. Forcing to 0.');
// 	totalCatchUp = 0;
// }

const enemyList = getEnemyListForQuest(templateId);
console.log('[liveCombatEngine] enemyList:', enemyList);

let templateRequired = null;
try {
const questTemplates = questsMod && questsMod.questTemplates ? questsMod.questTemplates : [];
const tpl = questTemplates.find((q) => q.id === templateId) || null;
if (tpl && tpl.objective) {
const m = String(tpl.objective).match(/(\d+)\s*(?:x|)?/i);
if (m && m[1]) templateRequired = Number(m[1]);
}
} catch (err) {}

for (let ei = 0; ei < enemyList.length; ei++) {
		const spec = enemyList[ei];
		const tplRule = dynamicSpawnRules[templateId];
		console.log('[liveCombatEngine] Processing enemy spec:', spec, 'Rule:', tplRule);
		
		// Dynamic Spawn Logic
		if (tplRule && !tplRule.solo && tplRule.lackey && tplRule.boss && spec.id === tplRule.lackey) {
			let killedLackeys = 0;
			const target = 20;
			console.log('[liveCombatEngine] Starting dynamic spawn loop', { templateId, target });
			while (_active && killedLackeys < target) {
				const r = Math.random();
				let perEncounter = r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
				perEncounter = Math.min(perEncounter, target - killedLackeys);
				
				for (let j = 0; j < perEncounter; j++) {
					if (!_active) {
						console.log('[liveCombatEngine] _active became false in inner loop');
						break;
					}

					// Skip if already processed in a previous session
					if (encounterIndex < currentProgress) {
						encounterIndex++;
						killedLackeys++;
						// Dispatch a "SKIPPED" event so the UI knows to log it if desired
						if (typeof window !== 'undefined') {
							window.dispatchEvent(new CustomEvent('combat:log', { 
								detail: { type: 'SKIPPED', actor: monsterBook.find((m) => m.id === tplRule.lackey)?.name || 'Enemy', index: encounterIndex } 
							}));
						}
						continue;
					}

					const monsterTemplate = monsterBook.find((m) => m.id === tplRule.lackey) || monsterBook[0];
					// Deep copy to prevent mutation of the base template
					const monster = JSON.parse(JSON.stringify(monsterTemplate));
					const attacker = buildAttackerFromState();
					console.log('[liveCombatEngine] Starting encounter vs', monster.name, 'Attacker HP:', attacker.stats.hp);
					
					const result = await runEncounter(attacker, monster, { ...options, catchUpBudget: totalCatchUp, startTime: (typeof serverNow === 'function' ? serverNow() : Date.now()) });
					console.log('[liveCombatEngine] Encounter result:', result);

					if (result.elapsedSimTime) {
						totalCatchUp = Math.max(0, totalCatchUp - result.elapsedSimTime);
					}
					
					encounterIndex++;
					updateQuestProgress(encounterIndex);

					try { if (saveManager && typeof saveManager.saveGame === 'function') saveManager.saveGame({ auto: true }); } catch (e) {}
					const curHp = Number(get(gameState).playerData?.hp || 0);
					if (curHp <= 0) {
						console.log('[liveCombatEngine] Player died, breaking loop');
						break;
					}

					// Drops
					handleDrops(templateId, monster, totalCatchUp > 0);
					killedLackeys++;

					// Travel/Search Delay
					const travelDelay = 5000;
					if (totalCatchUp > 0) {
						totalCatchUp = Math.max(0, totalCatchUp - travelDelay);
					} else if (_active) {
						await new Promise(resolve => setTimeout(resolve, travelDelay));
					}
				}
			}
			if (_active && killedLackeys >= target) {
				// Check skip for boss
				if (encounterIndex < currentProgress) {
					encounterIndex++;
					if (typeof window !== 'undefined') {
						window.dispatchEvent(new CustomEvent('combat:log', { 
							detail: { type: 'SKIPPED', actor: monsterBook.find((m) => m.id === tplRule.boss)?.name || 'Boss', index: encounterIndex } 
						}));
					}
				} else {
					const bossTemplate = monsterBook.find((m) => m.id === tplRule.boss) || monsterBook[0];
					const attacker = buildAttackerFromState();
					// Deep copy
					const bossMonster = JSON.parse(JSON.stringify(bossTemplate));
					const result = await runEncounter(attacker, bossMonster, { ...options, catchUpBudget: totalCatchUp, startTime: (typeof serverNow === 'function' ? serverNow() : Date.now()) });
					if (result.elapsedSimTime) {
						totalCatchUp = Math.max(0, totalCatchUp - result.elapsedSimTime);
					}
					encounterIndex++;
					updateQuestProgress(encounterIndex);
					try { if (saveManager && typeof saveManager.saveGame === 'function') saveManager.saveGame({ auto: true }); } catch (e) {}
					
					// Drops
					handleDrops(templateId, bossMonster, totalCatchUp > 0);

					// Travel/Search Delay
					const travelDelay = 5000;
					if (totalCatchUp > 0) {
						totalCatchUp = Math.max(0, totalCatchUp - travelDelay);
					} else if (_active) {
						await new Promise(resolve => setTimeout(resolve, travelDelay));
					}
				}

				// If the next enemy in the list is the boss we just spawned, skip it to avoid duplication
				if (ei + 1 < enemyList.length && enemyList[ei+1].id === tplRule.boss) {
					ei++;
				}
			}
			continue;
		}

		// Standard Spawn Logic
		const monsterTemplate = monsterBook.find((m) => m.id === spec.id) || monsterBook[0];
		let count = Number(spec.count) || 1;
		if (templateRequired && enemyList.length === 1) count = Math.min(count, templateRequired);
		
		for (let i = 0; i < count; i++) {
			if (!_active) break;

			// Skip if already processed
			if (encounterIndex < currentProgress) {
				encounterIndex++;
				if (typeof window !== 'undefined') {
					window.dispatchEvent(new CustomEvent('combat:log', { 
						detail: { type: 'SKIPPED', actor: monsterTemplate.name || 'Enemy', index: encounterIndex } 
					}));
				}
				continue;
			}

			const attacker = buildAttackerFromState();
			// Deep copy to prevent mutation
			const monster = JSON.parse(JSON.stringify(monsterTemplate));
			const result = await runEncounter(attacker, monster, { ...options, catchUpBudget: totalCatchUp, startTime: (typeof serverNow === 'function' ? serverNow() : Date.now()) });
			if (result.elapsedSimTime) {
				totalCatchUp = Math.max(0, totalCatchUp - result.elapsedSimTime);
			}
			
			encounterIndex++;
			updateQuestProgress(encounterIndex);

			try { if (saveManager && typeof saveManager.saveGame === 'function') saveManager.saveGame({ auto: true }); } catch (e) {}
			const curHp = Number(get(gameState).playerData?.hp || 0);
			if (curHp <= 0) break;

			handleDrops(templateId, monster, totalCatchUp > 0);

			// Travel/Search Delay
			const travelDelay = 5000;
			if (totalCatchUp > 0) {
				totalCatchUp = Math.max(0, totalCatchUp - travelDelay);
			} else if (_active) {
				await new Promise(resolve => setTimeout(resolve, travelDelay));
			}
		}
		if (!_active) break;
	}

	stop();
	return { started: true };
}

function updateQuestProgress(idx) {
	const now = (typeof serverNow === 'function' ? serverNow() : Date.now());
	activeQuest.update(q => { 
		if(q) {
			q.progress = idx; 
			q.lastProgressTimestamp = now;
		}
		return q; 
	});
	gameState.update(s => {
		if(s.character && s.character.activeQuest) {
			s.character.activeQuest.progress = idx;
			s.character.activeQuest.lastProgressTimestamp = now;
		}
		return s;
	});
}function handleDrops(templateId, monster, isCatchUp = false) {
try {
if (String(templateId || '').toUpperCase().startsWith('E')) {
const qty = generateEFragmentsForMonster(monster);
if (qty && qty > 0) {
const id = 2300001;
gameState.update((s) => {
const next = { ...s };
next.character = { ...next.character };
const inv = Array.isArray(next.character.inventory) ? [...next.character.inventory] : [];
const idx = inv.findIndex((it) => String(it.id) === String(id));
const dbEntry = { id, name: 'E-Rank Crystal Fragment', icon: '/Images/e-stone.png', category: 'Material' };
if (idx === -1) inv.push({ ...dbEntry, qty });
else inv[idx].qty = (inv[idx].qty || 0) + qty;
next.character.inventory = inv;
return next;
});
if (typeof window !== 'undefined') {
window.dispatchEvent(new CustomEvent('combat:log', { detail: { type: 'DROP', itemId: id, qty, actor: monster.name, isCatchUp } }));
}
} else {
if (typeof window !== 'undefined') {
window.dispatchEvent(new CustomEvent('combat:log', { detail: { type: 'NO_DROP', actor: monster.name, isCatchUp } }));
}
}
}
} catch (e) {}
}

export function stop() {
_active = false;
if (_currentSession && _currentSession.cancel) _currentSession.cancel();
_currentSession = null;
}

export default { startForActiveQuest, stop };
