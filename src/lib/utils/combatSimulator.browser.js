// Browser-friendly combat simulator used by dev UI
import { monsterBook } from '../data/monsters.js';
import skillsDb from '../data/skills.json';
import { tryUseSkill, handleIncomingDamage, autoCastSkills, setSkillsDb, resolveValue } from './skillSystem.js';

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

function skillHas(owner, id) {
	if (!owner || !id) return false;
	if (!Array.isArray(owner.skills)) return false;
	return owner.skills.some((s) => (typeof s === 'string' ? s === id : s && s.id === id));
}

function computeElementalMultiplierFor(owner, targetElement) {
	// If multiple elemental spirits exist, use the single highest applicable bonus
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

// Helper to process triggers (onHit, onCrit, onDodge)
function processTriggers(source, target, triggerType, context) {
	const { rand, log, now } = context;
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
			// Apply stun buff
			const duration = t.duration || 1;
			const buff = { id: 'stun', name: 'Stun', expiresAt: now + duration * 1000, effects: { stun: true } };
			context.deltas.push({ type: 'buff', target: t.target === 'self' ? 'source' : 'target', buff, sourceName: t.sourceName });
		}
	});
}

function deterministicFight(attacker, defender) {
	const a = attacker.stats;
	const d = defender.stats;
	const hitChance = computeHitChance(a.acc, d.eva);
	const avgDamagePerHit = a.dps * (1 + (a.cr || 0));
	const effectiveDPS = hitChance * avgDamagePerHit;
	const finalDPS = effectiveDPS / (1 + (d.phyDef || 0) / 100);
	const timeToKill = finalDPS > 0 ? d.hp / finalDPS : Infinity;
	const hitChanceD = computeHitChance(d.acc, a.eva);
	const avgDamagePerHitD = d.dps * (1 + (d.cr || 0));
	const finalDPSD = (hitChanceD * avgDamagePerHitD) / (1 + (a.phyDef || 0) / 100);
	const damageTaken = finalDPSD * timeToKill;
	return { hitChance, avgDamagePerHit, effectiveDPS, finalDPS, timeToKill, damageTaken };
}

function computeReflectDamage(victim, damage, activeBuffs, maxHp, now) {
	if (!victim || !damage) return { damage: 0, sources: [] };
	let totalReflected = 0;
	const sources = [];

	// DEBUG: Trace reflection inputs
	// console.log('[Reflect] Checking:', { victimName: victim.name, damage, activeBuffs, maxHp, now });

	// Check passive skills
	for (const s of Array.isArray(victim.skills) ? victim.skills : []) {
		const id = typeof s === 'string' ? s : s.id;
		const meta = skillsDb.find((m) => m.id === id);
		if (meta && meta.effects && meta.effects.reflectDamagePercent) {
			let amt = Math.round(damage * (meta.effects.reflectDamagePercent / 100));
			// Apply per-hit cap for passives if defined
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
			// Debug logging for reflection issues
			// console.log('Reflect Check:', { buffId, expiresAt: buff.expiresAt, timeCheck, hasEffect: !!(buff.effects && buff.effects.reflectDamagePercent) });
			
			if (buff.expiresAt > timeCheck && buff.effects && buff.effects.reflectDamagePercent) {
				let amt = Math.round(damage * (buff.effects.reflectDamagePercent / 100));
				
				// Apply cumulative cap per cast
				if (buff.effects.reflectCapPercent) {
					// Default maxHp to 100 if missing/zero to prevent zero-cap
					const effectiveMaxHp = maxHp > 0 ? maxHp : 100;
					const capTotal = Math.round(effectiveMaxHp * (buff.effects.reflectCapPercent / 100));
					const current = buff.accumulatedReflect || 0;
					const available = Math.max(0, capTotal - current);
					
					amt = Math.min(amt, available);
					
					// Update accumulated state on the buff object
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
			
			// 1. Apply Flat Modifiers
			if (e.physicalDamageFlat) s.dps = (s.dps || 0) + e.physicalDamageFlat;
			if (e.physicalDefenseFlat) s.phyDef = (s.phyDef || 0) + e.physicalDefenseFlat;
			if (e.magicDefenseFlat) s.magDef = (s.magDef || 0) + e.magicDefenseFlat;
			if (e.accuracyFlat) s.acc = (s.acc || 0) + e.accuracyFlat;
			if (e.evasionFlat) s.eva = (s.eva || 0) + e.evasionFlat;

			// 2. Apply Percentage Modifiers
			if (e.physicalDamagePercent) s.dps = (s.dps || 0) * (1 + e.physicalDamagePercent / 100);
			if (e.physicalDefensePercent) s.phyDef = (s.phyDef || 0) * (1 + e.physicalDefensePercent / 100);
			
			// Support both naming conventions for Magic Defense
			const magDefPct = e.magicDefensePercent || e.magicResistancePercent || 0;
			if (magDefPct) s.magDef = (s.magDef || 0) * (1 + magDefPct / 100);

			if (e.accuracyPercent) s.acc = (s.acc || 0) * (1 + e.accuracyPercent / 100);
			if (e.evasionPercent) s.eva = (s.eva || 0) * (1 + e.evasionPercent / 100);
		}
	}
	return s;
}

function simulateFight(attacker, defender, options = {}) {
	const seed = options.seed == null ? Date.now() & 0xffffffff : options.seed >>> 0;
	const rand = makeRng(seed);
	const logs = [];
	const a = { hp: attacker.stats.hp, sp: attacker.stats.sp || 0 };
	const d = { hp: defender.stats.hp, sp: defender.stats.sp || 0 };
	// const atk = attacker.stats; // Moved to inside loop for dynamic stats
	// const def = defender.stats; // Moved to inside loop for dynamic stats
	const attackerInterval = attacker.stats.attackIntervalMs || 1000;
	const defenderInterval = defender.stats.attackIntervalMs || 1000;
	let simTime = 0;
	let nextAtk = 0;
	let nextDef = 0;
	let round = 0;

	function log(type, data) {
		logs.push({ type, seed, simTime, round, ts: Date.now(), ...data });
	}

	// per-combat character state for cooldowns and active buffs
	// Initialize from passed attacker/defender state to persist across fights
	// Deep copy activeBuffs to ensure we don't mutate the source state directly but track local changes
	const aCharacter = { 
		skillCooldowns: { ...(attacker.skillCooldowns || {}) }, 
		activeBuffs: JSON.parse(JSON.stringify(attacker.activeBuffs || {}))
	};
	const dCharacter = { 
		skillCooldowns: { ...(defender.skillCooldowns || {}) }, 
		activeBuffs: JSON.parse(JSON.stringify(defender.activeBuffs || {}))
	};

	// DEBUG: Trace initial state
	// console.log('[SimStart] Attacker Buffs:', aCharacter.activeBuffs);
	// console.log('[SimStart] Defender Buffs:', dCharacter.activeBuffs);

	const aPlayerData = { hp: a.hp, maxHp: attacker.stats.maxHp || attacker.stats.hp, sp: a.sp, maxSp: attacker.stats.maxSp || attacker.stats.sp };
	const dPlayerData = { hp: d.hp, maxHp: defender.stats.maxHp || defender.stats.hp, sp: d.sp, maxSp: defender.stats.maxSp || defender.stats.sp };

	while (a.hp > 0 && d.hp > 0 && round < (options.maxRounds || 500)) {
		round += 1;
		const nextTime = Math.min(nextAtk, nextDef);
		simTime = nextTime;
		const now = Date.now() + simTime;

		// Check for expired buffs & Apply Tick Effects (DoT/HoT)
		[aCharacter, dCharacter].forEach((char, idx) => {
			const actorName = idx === 0 ? attacker.name : defender.name;
			const actorState = idx === 0 ? a : d;
			const actorMaxHp = idx === 0 ? (attacker.stats.maxHp || attacker.stats.hp) : (defender.stats.maxHp || defender.stats.hp);

			for (const buffId in char.activeBuffs) {
				const buff = char.activeBuffs[buffId];
				
				// Expire check
				if (buff.expiresAt <= now) {
					log('BUFF_EXPIRED', { actor: actorName, buff: buff.name || buffId });
					delete char.activeBuffs[buffId];
					continue;
				}

				// Apply Tick Effects (every 1s)
				if (buff.effects) {
					// Initialize nextTick if missing (start 1s from now if new, or catch up)
					if (!buff.nextTick) buff.nextTick = now + 1000;

					if (now >= buff.nextTick) {
						// Resolve stats for scaling ticks
						const sourceStats = idx === 0 ? attacker.stats : defender.stats; // Self-buff scaling? 
						// Usually DoT scales with caster stats at time of cast. 
						// But here we don't have the caster's snapshot easily. 
						// For now, use current actor stats or just raw value if resolved earlier.
						// If the buff was created via resolveValue, the effect value is already a number.
						// If it's a raw scaling object, we resolve it now.
						
						if (buff.effects.damageOverTime) {
							const val = buff.effects.damageOverTime;
							const dmg = typeof val === 'object' ? resolveValue(val, sourceStats) : val;
							actorState.hp -= dmg;
							log('DOT_TICK', { actor: actorName, buff: buff.name || buffId, damage: dmg });
						}
						if (buff.effects.healOverTime) {
							const val = buff.effects.healOverTime;
							const heal = typeof val === 'object' ? resolveValue(val, sourceStats) : val;
							const oldHp = actorState.hp;
							actorState.hp = Math.min(actorMaxHp, actorState.hp + heal);
							if (actorState.hp > oldHp) {
								log('HOT_TICK', { actor: actorName, buff: buff.name || buffId, heal: actorState.hp - oldHp });
							}
						}
						buff.nextTick += 1000;
					}
				}
			}
		});

		// Calculate effective stats for this moment
		const atk = getEffectiveStats(attacker.stats, aCharacter.activeBuffs, now);
		const def = getEffectiveStats(defender.stats, dCharacter.activeBuffs, now);

		// Check for Stun
		const isAttackerStunned = Object.values(aCharacter.activeBuffs).some(b => b.effects && b.effects.stun);
		const isDefenderStunned = Object.values(dCharacter.activeBuffs).some(b => b.effects && b.effects.stun);

		// attacker action when it's their turn or tie -> attacker first
		if (nextAtk <= nextDef) {
			if (isAttackerStunned) {
				log('STUNNED', { actor: attacker.name });
				nextAtk += attackerInterval;
				continue;
			}

			// auto heal / auto cast
			const autoRes = autoCastSkills(attacker, defender, { now, playerData: aPlayerData, healTrigger: 150, skillCooldowns: aCharacter.skillCooldowns });
			if (autoRes && autoRes.result && autoRes.result.used) {
				const res = autoRes.result;
				if (res.hpDelta) {
					a.hp = Math.min(attacker.stats.maxHp || attacker.stats.hp, a.hp + res.hpDelta);
					aPlayerData.hp = a.hp;
				}
				if (res.spDelta) {
					a.sp = Math.max(0, (a.sp || 0) + res.spDelta);
					aPlayerData.sp = a.sp;
				}
				if (res.damage) {
					d.hp -= res.damage;
				}
				if (res.cooldown && res.cooldown.skillCooldowns) {
					aCharacter.skillCooldowns = Object.assign({}, aCharacter.skillCooldowns, res.cooldown.skillCooldowns);
				}
				if (res.applied && res.buff) {
					aCharacter.activeBuffs = Object.assign({}, aCharacter.activeBuffs, { [res.buff.id]: res.buff });
				}
				log('SKILL_CAST', { actor: attacker.name, skill: autoRes.skillId, detail: res });
			}

			if (d.hp > 0 && a.hp > 0) {
				const hitChance = computeHitChance(atk.acc, def.eva);
				const roll = rand();
				const hit = roll < hitChance;

				// Trigger Context
				const triggerContext = { rand, log, now, deltas: [] };

				if (hit) {
					const variance = 0.9 + rand() * 0.2;
					const crit = rand() < (atk.cr || 0);
					const raw = atk.dps * variance * (crit ? 2 : 1);

					// Triggers: On Hit (Attacker) & On Get Hit (Defender)
					processTriggers(attacker, defender, 'onHit', triggerContext);
					processTriggers(defender, attacker, 'onGetHit', triggerContext);
					if (crit) processTriggers(attacker, defender, 'onCrit', triggerContext);

					// apply elemental modifiers if attacker has an elemental blessing/skill
					let rawWithElement = raw;
					try {
						const mult = computeElementalMultiplierFor(attacker, defender.element || defender.stats?.element);
						if (mult && mult !== 1) rawWithElement = raw * mult;
					} catch (e) {
						/* ignore */
					}
					let damage = Math.max(0, Math.round(rawWithElement / (1 + (def.phyDef || 0) / 100)));
					
					// defender auto barrier / reaction
					const handle = handleIncomingDamage(defender, dPlayerData, damage, { now, autoCast: true, skillCooldowns: dCharacter.skillCooldowns });
					
					if (handle && typeof handle.damageAfter === 'number') {
						const reduced = handle.reducedBy || 0;
						damage = handle.damageAfter;
						if (handle.autoCastResult && handle.autoCastResult.cooldown && handle.autoCastResult.buff) {
							if (handle.autoCastResult.cooldown.skillCooldowns) {
								dCharacter.skillCooldowns = Object.assign({}, dCharacter.skillCooldowns, handle.autoCastResult.cooldown.skillCooldowns);
							}
							if (handle.autoCastResult.buff) {
								dCharacter.activeBuffs = Object.assign({}, dCharacter.activeBuffs, { magicBarrier: handle.autoCastResult.buff });
							}
							if (typeof handle.autoCastResult.spDelta === 'number') {
								d.sp = Math.max(0, (d.sp || 0) + handle.autoCastResult.spDelta);
								dPlayerData.sp = d.sp;
							}
						}
						log('DEFENSE_RESULT', { simTime, round, actor: defender.name, reduced, after: damage, autoCast: handle && handle.autoCastResult ? handle.autoCastResult : null });
					}
					d.hp -= damage;
					
					// Check for reflection from defender
					// Pass active buffs and maxHp for cap calculation
					const reflectRes = computeReflectDamage(defender, damage, dCharacter.activeBuffs, dPlayerData.maxHp, now);
					const reflected = reflectRes.damage;
					if (reflected > 0) {
						a.hp -= reflected;
						aPlayerData.hp = a.hp;
						log('REFLECT_DAMAGE', {
							actor: defender.name,
							target: attacker.name,
							damage: reflected,
							sources: reflectRes.sources,
							targetHp: Math.max(0, a.hp)
						});
					}

					log('ATTACK_RESULT', {
						actor: attacker.name,
						target: defender.name,
						hit: true,
						roll,
						hitChance,
						crit,
						raw: Math.round(rawWithElement),
						damage,
						targetHp: Math.max(0, d.hp)
					});
				} else {
					// Triggers: On Dodge (Defender)
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
				if (triggerContext && triggerContext.deltas) {
					triggerContext.deltas.forEach(delta => {
						const targetState = delta.target === 'source' ? a : d;
						const targetName = delta.target === 'source' ? attacker.name : defender.name;
						const targetMaxHp = delta.target === 'source' ? (attacker.stats.maxHp || attacker.stats.hp) : (defender.stats.maxHp || defender.stats.hp);
						const targetChar = delta.target === 'source' ? aCharacter : dCharacter;

						if (delta.type === 'damage') {
							targetState.hp -= delta.amount;
							log('DOT_TICK', { actor: targetName, buff: delta.sourceName, damage: delta.amount }); 
						}
						if (delta.type === 'heal') {
							targetState.hp = Math.min(targetMaxHp, targetState.hp + delta.amount);
							log('HOT_TICK', { actor: targetName, buff: delta.sourceName, heal: delta.amount });
						}
						if (delta.type === 'buff' && delta.buff) {
							targetChar.activeBuffs = Object.assign({}, targetChar.activeBuffs, { [delta.buff.id]: delta.buff });
							log('SKILL_CAST', { actor: delta.target === 'source' ? attacker.name : defender.name, skill: delta.sourceName, detail: { buff: delta.buff } });
						}
					});
				}
			}
			if (d.hp <= 0) {
				log('DEATH', { actor: defender.name });
				break;
			}
			if (a.hp <= 0) {
				log('DEATH', { actor: attacker.name });
				break;
			}
			nextAtk += attackerInterval;
			continue;
		}

		// defender action
		if (nextDef < nextAtk) {
			if (isDefenderStunned) {
				log('STUNNED', { actor: defender.name });
				nextDef += defenderInterval;
				continue;
			}

			const hitChance = computeHitChance(def.acc, atk.eva);
			const roll = rand();
			const hit = roll < hitChance;
			if (hit) {
				const variance = 0.9 + rand() * 0.2;
				const crit = rand() < (def.cr || 0);
				const raw = def.dps * variance * (crit ? 2 : 1);
				// apply elemental modifiers for defender-as-attacker
				let rawWithElement = raw;
				try {
					const mult = computeElementalMultiplierFor(defender, attacker.element || attacker.stats?.element);
					if (mult && mult !== 1) rawWithElement = raw * mult;
				} catch (e) {
					/* ignore */
				}
				let damage = Math.max(0, Math.round(rawWithElement / (1 + (atk.phyDef || 0) / 100)));
				
				// attacker auto barrier / reaction
				const handleD = handleIncomingDamage(attacker, aPlayerData, damage, { now, autoCast: true, skillCooldowns: aCharacter.skillCooldowns });
				
				if (handleD && typeof handleD.damageAfter === 'number') {
					const reduced = handleD.reducedBy || 0;
					damage = handleD.damageAfter;
					if (handleD.autoCastResult && handleD.autoCastResult.cooldown && handleD.autoCastResult.buff) {
						if (handleD.autoCastResult.cooldown.skillCooldowns) {
							aCharacter.skillCooldowns = Object.assign({}, aCharacter.skillCooldowns, handleD.autoCastResult.cooldown.skillCooldowns);
						}
						if (handleD.autoCastResult.buff) {
							aCharacter.activeBuffs = Object.assign({}, aCharacter.activeBuffs, { magicBarrier: handleD.autoCastResult.buff });
						}
						if (typeof handleD.autoCastResult.spDelta === 'number') {
							a.sp = Math.max(0, (a.sp || 0) + handleD.autoCastResult.spDelta);
							aPlayerData.sp = a.sp;
						}
					}
					log('DEFENSE_RESULT', { simTime, round, actor: attacker.name, reduced, after: damage, autoCast: handleD && handleD.autoCastResult ? handleD.autoCastResult : null });
				}
				a.hp -= damage;

				// Check for reflection from attacker
				const reflectRes = computeReflectDamage(attacker, damage, aCharacter.activeBuffs, aPlayerData.maxHp, now);
				const reflected = reflectRes.damage;
				if (reflected > 0) {
					d.hp -= reflected;
					dPlayerData.hp = d.hp;
					log('REFLECT_DAMAGE', {
						actor: attacker.name,
						target: defender.name,
						damage: reflected,
						sources: reflectRes.sources,
						targetHp: Math.max(0, d.hp)
					});
				}

				log('ATTACK_RESULT', {
					actor: defender.name,
					target: attacker.name,
					hit: true,
					roll,
					hitChance,
					crit,
					raw: Math.round(rawWithElement),
					damage,
					targetHp: Math.max(0, a.hp)
				});
			} else {
				log('ATTACK_RESULT', {
					actor: defender.name,
					target: attacker.name,
					hit: false,
					roll,
					hitChance
				});
			}
			if (a.hp <= 0) {
				log('DEATH', { actor: attacker.name });
				break;
			}
			nextDef += defenderInterval;
			continue;
		}
	}

	return { seed, logs, final: { attackerHp: a.hp, defenderHp: d.hp } };
}

export { deterministicFight, simulateFight };

export default { deterministicFight, simulateFight };
