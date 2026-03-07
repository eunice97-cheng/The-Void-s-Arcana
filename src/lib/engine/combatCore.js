// Core Combat Logic (Real-time Step Based)
import skillsDb from '../data/skills.json';
import { tryUseSkill, handleIncomingDamage, autoCastSkills, setSkillsDb, resolveValue } from '$lib/utils/skillSystem.js';
import { serverNow } from '$lib/stores/questStore';

// Initialize skill system
setSkillsDb(skillsDb);

// Elemental skill ids that grant elementalAgainst modifiers
const ELEMENTAL_SKILL_IDS = new Set([
	'mage_ifrit',
	'mage_ifrit_adv',
	'mage_nereid',
	'mage_nereid_adv',
	'mage_verdure',
	'mage_verdure_adv',
	'mage_zephyr',
	'mage_zephyr_adv'
]);

function computeElementalMultiplierFor(owner, targetElement) {
	if (!owner || !targetElement) return 1;
	const el = String(targetElement).toLowerCase();
	let best = 0;
	const skillIds = Array.isArray(owner.skills)
		? owner.skills.map((s) => (typeof s === 'string' ? s : s.id))
		: [];
	if (owner.alexiChosenElement) skillIds.push(owner.alexiChosenElement);
	for (const id of skillIds) {
		if (!id || !ELEMENTAL_SKILL_IDS.has(id)) continue;
		const meta = skillsDb.find((s) => s.id === id);
		if (!meta || !meta.effects || !meta.effects.elementalAgainst) continue;
		const map = meta.effects.elementalAgainst;
		if (Object.prototype.hasOwnProperty.call(map, el)) {
			const val = Number(map[el]) || 0;
			if (val > best) best = val;
		}
	}
	return 1 + best / 100;
}

function makeRng(seed) {
	let t = seed >>> 0;
	return function () {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function computeHitChance(acc, eva) {
	if (acc + eva === 0) return 0;
	return acc / (acc + eva);
}

function computeReflectDamage(victim, damage, activeBuffs, maxHp, now) {
	if (!victim || !damage) return { damage: 0, sources: [] };
	let totalReflected = 0;
	const sources = [];

	// Check passive skills
	for (const s of Array.isArray(victim.skills) ? victim.skills : []) {
		const id = typeof s === 'string' ? s : s.id;
		const meta = skillsDb.find((m) => m.id === id);
		if (meta && meta.type === 'passive' && meta.effects && meta.effects.reflectDamagePercent) {
			let amt = Math.round(damage * (meta.effects.reflectDamagePercent / 100));
			if (meta.effects.reflectCapPercent && maxHp > 0) {
				const cap = Math.round(maxHp * (meta.effects.reflectCapPercent / 100));
				amt = Math.min(amt, cap);
			}
			if (amt > 0) {
				totalReflected += amt;
				sources.push(meta.name || id);
			}
		}
	}

	// Check active buffs
	if (activeBuffs) {
		const timeCheck = now || Date.now();
		for (const buffId in activeBuffs) {
			const buff = activeBuffs[buffId];
			if (buff.expiresAt > timeCheck && buff.effects && buff.effects.reflectDamagePercent) {
				let amt = Math.round(damage * (buff.effects.reflectDamagePercent / 100));
				if (buff.effects.reflectCapPercent) {
					const effectiveMaxHp = maxHp > 0 ? maxHp : 100;
					const capTotal = Math.round(effectiveMaxHp * (buff.effects.reflectCapPercent / 100));
					const current = buff.accumulatedReflect || 0;
					const available = Math.max(0, capTotal - current);
					amt = Math.min(amt, available);
					buff.accumulatedReflect = current + amt;
				}
				if (amt > 0) {
					totalReflected += amt;
					sources.push(buff.name || buffId);
				}
			}
		}
	}
	return { damage: totalReflected, sources };
}

function getEffectiveStats(baseStats, activeBuffs, now) {
	const s = { ...baseStats };
	if (!activeBuffs) return s;
	for (const buffId in activeBuffs) {
		const buff = activeBuffs[buffId];
		if (buff.expiresAt > now && buff.effects) {
			const e = buff.effects;
			if (e.physicalDamageFlat) s.dps = (s.dps || 0) + e.physicalDamageFlat;
			if (e.physicalDefenseFlat) s.phyDef = (s.phyDef || 0) + e.physicalDefenseFlat;
			if (e.magicDefenseFlat) s.magDef = (s.magDef || 0) + e.magicDefenseFlat;
			if (e.accuracyFlat) s.acc = (s.acc || 0) + e.accuracyFlat;
			if (e.evasionFlat) s.eva = (s.eva || 0) + e.evasionFlat;
			if (e.physicalDamagePercent) s.dps = (s.dps || 0) * (1 + e.physicalDamagePercent / 100);
			if (e.physicalDefensePercent) s.phyDef = (s.phyDef || 0) * (1 + e.physicalDefensePercent / 100);
			const magDefPct = e.magicDefensePercent || e.magicResistancePercent || 0;
			if (magDefPct) s.magDef = (s.magDef || 0) * (1 + magDefPct / 100);
			if (e.accuracyPercent) s.acc = (s.acc || 0) * (1 + e.accuracyPercent / 100);
			if (e.evasionPercent) s.eva = (s.eva || 0) * (1 + e.evasionPercent / 100);
		}
	}
	return s;
}

// Helper to process triggers (onHit, onCrit, onDodge)
function processTriggers(source, target, triggerType, context) {
	const { rand, now } = context;
	const triggers = [];

	// 1. Check Skills (Passives)
	if (source.skills) {
		source.skills.forEach(s => {
			const id = typeof s === 'string' ? s : s.id;
			const meta = skillsDb.find(m => m.id === id);
			if (meta && meta.triggers && meta.triggers[triggerType]) {
				triggers.push({ ...meta.triggers[triggerType], sourceName: meta.name || id });
			}
		});
	}

	// 2. Check Active Buffs
	if (source.activeBuffs) {
		Object.values(source.activeBuffs).forEach(buff => {
			if (buff.expiresAt > now && buff.effects && buff.effects.triggers && buff.effects.triggers[triggerType]) {
				triggers.push({ ...buff.effects.triggers[triggerType], sourceName: buff.name || buff.id });
			}
		});
	}

	// Execute Triggers
	triggers.forEach(t => {
		if (t.chance && rand() > t.chance) return; // Chance check

		// Resolve stats for scaling
		const sourceStats = source.stats || {};

		// Apply Effect
		if (t.effect === 'damage') {
			const dmg = resolveValue(t.amount, sourceStats);
			context.deltas.push({ type: 'damage', target: t.target === 'self' ? 'source' : 'target', amount: dmg, sourceName: t.sourceName });
		}
		if (t.effect === 'heal') {
			const amt = resolveValue(t.amount, sourceStats);
			context.deltas.push({ type: 'heal', target: t.target === 'self' ? 'source' : 'target', amount: amt, sourceName: t.sourceName });
		}
		if (t.effect === 'stun') {
			const duration = t.duration || 1;
			const buff = { id: 'stun', name: 'Stun', expiresAt: now + duration * 1000, effects: { stun: true } };
			context.deltas.push({ type: 'buff', target: t.target === 'self' ? 'source' : 'target', buff, sourceName: t.sourceName });
		}
	});
}

// --- Core State Management ---

export function createCombatState(attacker, defender, options = {}) {
	const seed = options.seed == null ? Date.now() & 0xffffffff : options.seed >>> 0;
	const startTime = options.startTime || (typeof serverNow === 'function' ? serverNow() : Date.now());
	
	// Deep copy activeBuffs to ensure we don't mutate the source state directly but track local changes
	const aCharacter = { 
		skillCooldowns: { ...(attacker.skillCooldowns || {}) }, 
		activeBuffs: JSON.parse(JSON.stringify(attacker.activeBuffs || {}))
	};
	const dCharacter = { 
		skillCooldowns: { ...(defender.skillCooldowns || {}) }, 
		activeBuffs: JSON.parse(JSON.stringify(defender.activeBuffs || {}))
	};

	return {
		seed,
		startTime,
		rand: makeRng(seed),
		simTime: 0,
		round: 0,
		nextAtk: 0,
		nextDef: 0,
		attacker: { ...attacker, hp: attacker.stats.hp, sp: attacker.stats.sp || 0, character: aCharacter },
		defender: { ...defender, hp: defender.stats.hp, sp: defender.stats.sp || 0, character: dCharacter },
		logs: [],
		finished: false,
		winner: null
	};
}

export function processTick(state) {
	if (state.finished) return { events: [], ops: [] };

	const { attacker, defender, rand } = state;
	const events = [];
	const ops = []; // Operations to apply to external state (if needed)

	// Helper to log events
	function log(type, data) {
		const entry = { type, seed: state.seed, simTime: state.simTime, round: state.round, ts: Date.now(), ...data };
		events.push(entry);
		state.logs.push(entry);
	}

	// Helper to record state operations
	function op(type, target, data) {
		ops.push({ type, target, ...data });
	}

	state.round += 1;
	const nextTime = Math.min(state.nextAtk, state.nextDef);
	state.simTime = nextTime;
	const now = state.startTime + state.simTime;

	const attackerInterval = attacker.stats.attackIntervalMs || 1000;
	const defenderInterval = defender.stats.attackIntervalMs || 1000;

	// Check for expired buffs & Apply Tick Effects (DoT/HoT)
	[attacker, defender].forEach((actor, idx) => {
		const actorName = actor.name;
		const char = actor.character;
		const actorMaxHp = actor.stats.maxHp || actor.stats.hp;
		const targetKey = idx === 0 ? 'attacker' : 'defender';

		for (const buffId in char.activeBuffs) {
			const buff = char.activeBuffs[buffId];
			
			// Expire check
			if (buff.expiresAt <= now) {
				log('BUFF_EXPIRED', { actor: actorName, buff: buff.name || buffId });
				op('REMOVE_BUFF', targetKey, { id: buffId });
				delete char.activeBuffs[buffId];
				continue;
			}

			// Apply Tick Effects (every 1s)
			if (buff.effects) {
				if (!buff.nextTick) buff.nextTick = now + 1000;

				if (now >= buff.nextTick) {
					const sourceStats = idx === 0 ? attacker.stats : defender.stats; 
					
					if (buff.effects.damageOverTime) {
						const val = buff.effects.damageOverTime;
						const dmg = typeof val === 'object' ? resolveValue(val, sourceStats) : val;
						actor.hp -= dmg;
						op('MODIFY_STAT', targetKey, { stat: 'hp', value: -dmg });
						log('DOT_TICK', { actor: actorName, buff: buff.name || buffId, damage: dmg });
					}
					if (buff.effects.healOverTime) {
						const val = buff.effects.healOverTime;
						const heal = typeof val === 'object' ? resolveValue(val, sourceStats) : val;
						const oldHp = actor.hp;
						actor.hp = Math.min(actorMaxHp, actor.hp + heal);
						if (actor.hp > oldHp) {
							const healed = actor.hp - oldHp;
							op('MODIFY_STAT', targetKey, { stat: 'hp', value: healed });
							log('HOT_TICK', { actor: actorName, buff: buff.name || buffId, heal: healed });
						}
					}
					buff.nextTick += 1000;
				}
			}
		}
	});

	// Calculate effective stats
	const atk = getEffectiveStats(attacker.stats, attacker.character.activeBuffs, now);
	const def = getEffectiveStats(defender.stats, defender.character.activeBuffs, now);

	// Check for Stun
	const isAttackerStunned = Object.values(attacker.character.activeBuffs).some(b => b.effects && b.effects.stun);
	const isDefenderStunned = Object.values(defender.character.activeBuffs).some(b => b.effects && b.effects.stun);

	// Attacker Turn
	if (state.nextAtk <= state.nextDef) {
		if (isAttackerStunned) {
			log('STUNNED', { actor: attacker.name });
			state.nextAtk += attackerInterval;
			return { events, ops };
		}

		// Auto Cast / Heal
		const aPlayerData = { hp: attacker.hp, maxHp: attacker.stats.maxHp || attacker.stats.hp, sp: attacker.sp, maxSp: attacker.stats.maxSp || attacker.stats.sp };
		const autoRes = autoCastSkills(attacker, defender, { now, playerData: aPlayerData, healTrigger: 150, skillCooldowns: attacker.character.skillCooldowns });
		
		if (autoRes && autoRes.result && autoRes.result.used) {
			const res = autoRes.result;
			if (res.hpDelta) {
				attacker.hp = Math.min(attacker.stats.maxHp || attacker.stats.hp, attacker.hp + res.hpDelta);
				op('MODIFY_STAT', 'attacker', { stat: 'hp', value: res.hpDelta });
			}
			if (res.spDelta) {
				attacker.sp = Math.max(0, (attacker.sp || 0) + res.spDelta);
				op('MODIFY_STAT', 'attacker', { stat: 'sp', value: res.spDelta });
			}
			if (res.damage) {
				defender.hp -= res.damage;
				op('MODIFY_STAT', 'defender', { stat: 'hp', value: -res.damage });
			}
			if (res.cooldown && res.cooldown.skillCooldowns) {
				Object.assign(attacker.character.skillCooldowns, res.cooldown.skillCooldowns);
				op('SET_COOLDOWN', 'attacker', { cooldowns: res.cooldown.skillCooldowns });
			}
			if (res.applied && res.buff) {
				attacker.character.activeBuffs[res.buff.id] = res.buff;
				op('ADD_BUFF', 'attacker', { buff: res.buff });
			}
			log('SKILL_CAST', { actor: attacker.name, skill: autoRes.skillId, detail: res });
		}

		if (defender.hp > 0 && attacker.hp > 0) {
			const hitChance = computeHitChance(atk.acc, def.eva);
			const roll = rand();
			const hit = roll < hitChance;
			const triggerContext = { rand, log, now, deltas: [] };

			if (hit) {
				const variance = 0.9 + rand() * 0.2;
				const crit = rand() < (atk.cr || 0);
				const raw = atk.dps * variance * (crit ? 2 : 1);

				processTriggers(attacker, defender, 'onHit', triggerContext);
				processTriggers(defender, attacker, 'onGetHit', triggerContext);
				if (crit) processTriggers(attacker, defender, 'onCrit', triggerContext);

				let rawWithElement = raw;
				try {
					const mult = computeElementalMultiplierFor(attacker, defender.element || defender.stats?.element);
					if (mult && mult !== 1) rawWithElement = raw * mult;
				} catch (e) {}
				
				let damage = Math.max(0, Math.round(rawWithElement / (1 + (def.phyDef || 0) / 100)));
				
				// Defender Reaction (Barrier)
				const dPlayerData = { hp: defender.hp, maxHp: defender.stats.maxHp || defender.stats.hp, sp: defender.sp, maxSp: defender.stats.maxSp || defender.stats.sp };
				const handle = handleIncomingDamage(defender, dPlayerData, damage, { now, autoCast: true, skillCooldowns: defender.character.skillCooldowns });
				
				if (handle && typeof handle.damageAfter === 'number') {
					const reduced = handle.reducedBy || 0;
					damage = handle.damageAfter;
					if (handle.autoCastResult && handle.autoCastResult.cooldown && handle.autoCastResult.buff) {
						if (handle.autoCastResult.cooldown.skillCooldowns) {
							Object.assign(defender.character.skillCooldowns, handle.autoCastResult.cooldown.skillCooldowns);
							op('SET_COOLDOWN', 'defender', { cooldowns: handle.autoCastResult.cooldown.skillCooldowns });
						}
						if (handle.autoCastResult.buff) {
							defender.character.activeBuffs.magicBarrier = handle.autoCastResult.buff;
							op('ADD_BUFF', 'defender', { buff: handle.autoCastResult.buff });
						}
						if (typeof handle.autoCastResult.spDelta === 'number') {
							defender.sp = Math.max(0, (defender.sp || 0) + handle.autoCastResult.spDelta);
							op('MODIFY_STAT', 'defender', { stat: 'sp', value: handle.autoCastResult.spDelta });
						}
					}
					log('DEFENSE_RESULT', { simTime: state.simTime, round: state.round, actor: defender.name, reduced, after: damage, autoCast: handle && handle.autoCastResult ? handle.autoCastResult : null });
				}

				defender.hp -= damage;
				op('MODIFY_STAT', 'defender', { stat: 'hp', value: -damage });

				log('ATTACK_RESULT', {
					actor: attacker.name,
					target: defender.name,
					hit: true,
					roll,
					hitChance,
					crit,
					raw: Math.round(rawWithElement),
					damage,
					targetHp: Math.max(0, defender.hp)
				});

				// Reflection
				const reflectRes = computeReflectDamage(defender, damage, defender.character.activeBuffs, defender.stats.maxHp || defender.stats.hp, now);
				const reflected = reflectRes.damage;
				if (reflected > 0) {
					attacker.hp -= reflected;
					op('MODIFY_STAT', 'attacker', { stat: 'hp', value: -reflected });
					log('REFLECT_DAMAGE', {
						actor: defender.name,
						target: attacker.name,
						damage: reflected,
						sources: reflectRes.sources,
						targetHp: Math.max(0, attacker.hp)
					});
				}
			} else {
				processTriggers(defender, attacker, 'onDodge', triggerContext);
				log('ATTACK_RESULT', {
					actor: attacker.name,
					target: defender.name,
					hit: false,
					roll,
					hitChance
				});
			}

			// Apply Trigger Deltas
			if (triggerContext.deltas) {
				triggerContext.deltas.forEach(delta => {
					const targetKey = delta.target === 'source' ? 'attacker' : 'defender';
					const targetState = delta.target === 'source' ? attacker : defender;
					const targetChar = delta.target === 'source' ? attacker.character : defender.character;
					const targetMaxHp = targetState.stats.maxHp || targetState.stats.hp;

					if (delta.type === 'damage') {
						targetState.hp -= delta.amount;
						op('MODIFY_STAT', targetKey, { stat: 'hp', value: -delta.amount });
						log('DOT_TICK', { actor: targetState.name, buff: delta.sourceName, damage: delta.amount });
					}
					if (delta.type === 'heal') {
						const oldHp = targetState.hp;
						targetState.hp = Math.min(targetMaxHp, targetState.hp + delta.amount);
						if (targetState.hp > oldHp) {
							op('MODIFY_STAT', targetKey, { stat: 'hp', value: targetState.hp - oldHp });
							log('HOT_TICK', { actor: targetState.name, buff: delta.sourceName, heal: targetState.hp - oldHp });
						}
					}
					if (delta.type === 'buff' && delta.buff) {
						targetChar.activeBuffs[delta.buff.id] = delta.buff;
						op('ADD_BUFF', targetKey, { buff: delta.buff });
						log('SKILL_CAST', { actor: targetState.name, skill: delta.sourceName, detail: { buff: delta.buff } });
					}
				});
			}
		}

		if (defender.hp <= 0) {
			log('DEATH', { actor: defender.name });
			state.finished = true;
			state.winner = 'attacker';
			return { events, ops };
		}
		if (attacker.hp <= 0) {
			log('DEATH', { actor: attacker.name });
			state.finished = true;
			state.winner = 'defender';
			return { events, ops };
		}

		state.nextAtk += attackerInterval;
		return { events, ops };
	}

	// Defender Turn
	if (state.nextDef < state.nextAtk) {
		if (isDefenderStunned) {
			log('STUNNED', { actor: defender.name });
			state.nextDef += defenderInterval;
			return { events, ops };
		}

		const hitChance = computeHitChance(def.acc, atk.eva);
		const roll = rand();
		const hit = roll < hitChance;
		const triggerContext = { rand, log, now, deltas: [] };

		if (hit) {
			const variance = 0.9 + rand() * 0.2;
			const crit = rand() < (def.cr || 0);
			const raw = def.dps * variance * (crit ? 2 : 1);

			let rawWithElement = raw;
			try {
				const mult = computeElementalMultiplierFor(defender, attacker.element || attacker.stats?.element);
				if (mult && mult !== 1) rawWithElement = raw * mult;
			} catch (e) {}
			
			let damage = Math.max(0, Math.round(rawWithElement / (1 + (atk.phyDef || 0) / 100)));
			
			// Attacker Reaction (Barrier)
			const aPlayerData = { hp: attacker.hp, maxHp: attacker.stats.maxHp || attacker.stats.hp, sp: attacker.sp, maxSp: attacker.stats.maxSp || attacker.stats.sp };
			const handleD = handleIncomingDamage(attacker, aPlayerData, damage, { now, autoCast: true, skillCooldowns: attacker.character.skillCooldowns });
			
			if (handleD && typeof handleD.damageAfter === 'number') {
				const reduced = handleD.reducedBy || 0;
				damage = handleD.damageAfter;
				if (handleD.autoCastResult && handleD.autoCastResult.cooldown && handleD.autoCastResult.buff) {
					if (handleD.autoCastResult.cooldown.skillCooldowns) {
						Object.assign(attacker.character.skillCooldowns, handleD.autoCastResult.cooldown.skillCooldowns);
						op('SET_COOLDOWN', 'attacker', { cooldowns: handleD.autoCastResult.cooldown.skillCooldowns });
					}
					if (handleD.autoCastResult.buff) {
						attacker.character.activeBuffs.magicBarrier = handleD.autoCastResult.buff;
						op('ADD_BUFF', 'attacker', { buff: handleD.autoCastResult.buff });
					}
					if (typeof handleD.autoCastResult.spDelta === 'number') {
						attacker.sp = Math.max(0, (attacker.sp || 0) + handleD.autoCastResult.spDelta);
						op('MODIFY_STAT', 'attacker', { stat: 'sp', value: handleD.autoCastResult.spDelta });
					}
				}
				log('DEFENSE_RESULT', { simTime: state.simTime, round: state.round, actor: attacker.name, reduced, after: damage, autoCast: handleD && handleD.autoCastResult ? handleD.autoCastResult : null });
			}

			attacker.hp -= damage;
			op('MODIFY_STAT', 'attacker', { stat: 'hp', value: -damage });

			log('ATTACK_RESULT', {
				actor: defender.name,
				target: attacker.name,
				hit: true,
				roll,
				hitChance,
				crit,
				raw: Math.round(rawWithElement),
				damage,
				targetHp: Math.max(0, attacker.hp)
			});

			// Reflection (Attacker Reflects)
			const reflectRes = computeReflectDamage(attacker, damage, attacker.character.activeBuffs, attacker.stats.maxHp || attacker.stats.hp, now);
			const reflected = reflectRes.damage;
			if (reflected > 0) {
				defender.hp -= reflected;
				op('MODIFY_STAT', 'defender', { stat: 'hp', value: -reflected });
				log('REFLECT_DAMAGE', {
					actor: attacker.name,
					target: defender.name,
					damage: reflected,
					sources: reflectRes.sources,
					targetHp: Math.max(0, defender.hp)
				});
			}
		} else {
			log('ATTACK_RESULT', {
				actor: defender.name,
				target: attacker.name,
				hit: false,
				roll,
				hitChance
			});
		}

		if (attacker.hp <= 0) {
			log('DEATH', { actor: attacker.name });
			state.finished = true;
			state.winner = 'defender';
			return { events, ops };
		}
		if (defender.hp <= 0) {
			log('DEATH', { actor: defender.name });
			state.finished = true;
			state.winner = 'attacker';
			return { events, ops };
		}

		state.nextDef += defenderInterval;
		return { events, ops };
	}

	return { events, ops };
}

export default { createCombatState, processTick };
