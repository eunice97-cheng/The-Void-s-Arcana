// Combat simulator utilities
// Exports deterministic calculator and seeded stochastic simulator

import fs from 'fs';
import { tryUseSkill, handleIncomingDamage, autoCastSkills, setSkillsDb } from './skillSystem.js';

const skillsDb = JSON.parse(
	fs.readFileSync(new URL('../data/skills.json', import.meta.url), 'utf8')
);
setSkillsDb(skillsDb);

function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}

function computeHitChance(acc, eva) {
	if (acc + eva === 0) return 0;
	return acc / (acc + eva);
}

function deterministicFight(attacker, defender, opts = {}) {
	// attacker/defender: { stats: { hp,dps,acc,eva,phyDef,magDef,cr }, name }
	const a = attacker.stats;
	const d = defender.stats;

	const hitChance = computeHitChance(a.acc, d.eva);
	const avgDamagePerHit = a.dps * (1 + (a.cr || 0));
	const effectiveDPS = hitChance * avgDamagePerHit;
	const finalDPS = effectiveDPS / (1 + (d.phyDef || 0) / 100);
	const timeToKill = finalDPS > 0 ? d.hp / finalDPS : Infinity;

	// defender damage back
	const hitChanceD = computeHitChance(d.acc, a.eva);
	const avgDamagePerHitD = d.dps * (1 + (d.cr || 0));
	const effectiveDPSD = hitChanceD * avgDamagePerHitD;
	const finalDPSD = effectiveDPSD / (1 + (a.phyDef || 0) / 100);
	const damageTaken = finalDPSD * timeToKill;

	return {
		attacker: attacker.name || 'attacker',
		defender: defender.name || 'defender',
		hitChance,
		avgDamagePerHit,
		effectiveDPS,
		finalDPS,
		timeToKill,
		defenderHitChance: hitChanceD,
		defenderFinalDPS: finalDPSD,
		damageTaken
	};
}

function computeReflectDamage(victim, damage) {
	if (!victim || !damage) return 0;
	let reflectPct = 0;
	for (const s of Array.isArray(victim.skills) ? victim.skills : []) {
		const id = typeof s === 'string' ? s : s.id;
		const meta = skillsDb.find((m) => m.id === id);
		if (meta && meta.effects && meta.effects.reflectDamagePercent) {
			reflectPct += meta.effects.reflectDamagePercent;
		}
	}
	if (reflectPct > 0) {
		return Math.round(damage * (reflectPct / 100));
	}
	return 0;
}

// Simple seedable PRNG (mulberry32)
function makeRng(seed) {
	let t = seed >>> 0;
	return function () {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function simulateFight(attacker, defender, options = {}) {
	// options: seed (int), maxRounds
	const seed = options.seed == null ? Date.now() & 0xffffffff : options.seed >>> 0;
	const rand = makeRng(seed);
	const maxRounds = options.maxRounds || 200;
	const logs = [];

	// clone stats and create minimal character/playerData wrappers for skill engine
	const a = { hp: attacker.stats.hp, sp: attacker.stats.sp || 0 };
	const d = { hp: defender.stats.hp, sp: defender.stats.sp || 0 };

	const atk = attacker.stats;
	const def = defender.stats;

	const aCharacter = { skillCooldowns: {}, activeBuffs: {} };
	const dCharacter = { skillCooldowns: {}, activeBuffs: {} };

	const aPlayerData = { hp: a.hp, maxHp: attacker.stats.hp, sp: a.sp };
	const dPlayerData = { hp: d.hp, maxHp: defender.stats.hp, sp: d.sp };

	// time-based simulation: each combatant has an attackInterval (ms). default 1000ms per attack
	const baseNow = Date.now();
	let simTime = 0; // milliseconds since start
	const attackerInterval = Math.max(100, Math.round(attacker.stats.attackIntervalMs || 1000));
	const defenderInterval = Math.max(100, Math.round(defender.stats.attackIntervalMs || 1000));
	let nextAtkTime = 0;
	let nextDefTime = 0;
	let round = 0;

	const skillLookup = (owner, id) => {
		if (!owner || !Array.isArray(owner.skills)) return null;
		const found = owner.skills.find((s) => (typeof s === 'string' ? s === id : s.id === id));
		if (!found) return null;
		// find metadata in skillsDb
		const meta = skillsDb.find((m) => m.id === (typeof found === 'string' ? found : found.id));
		return meta || found;
	};

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
		// Rule: if player has more than one elemental spirit, use the single highest
		// applicable `elementalAgainst` value (do NOT sum them).
		if (!owner || !targetElement) return 1;
		const el = String(targetElement).toLowerCase();
		let best = 0;
		for (const s of Array.isArray(owner.skills) ? owner.skills : []) {
			const id = typeof s === 'string' ? s : s.id;
			if (!id || !ELEMENTAL_SKILL_IDS.has(id)) continue;
			const meta = skillsDb.find((m) => m.id === id);
			if (!meta || !meta.effects || !meta.effects.elementalAgainst) continue;
			const map = meta.effects.elementalAgainst;
			if (Object.prototype.hasOwnProperty.call(map, el)) {
				const val = Number(map[el]) || 0;
				if (val > best) best = val;
			}
		}
		return 1 + best / 100;
	}

	function log(type, data) {
		logs.push({ type, seed, ts: Date.now(), ...data });
	}

	// Time-based event loop
	while (a.hp > 0 && d.hp > 0 && round < maxRounds) {
		round += 1;
		// pick who acts next by earliest next action time
		const nextTime = Math.min(nextAtkTime, nextDefTime);
		simTime = nextTime;
		const now = baseNow + simTime;

		// Attacker acts
		if (nextAtkTime <= nextDefTime) {
			// auto-skill check using simulated now
			const autoRes = autoCastSkills(attacker, defender, { now, playerData: aPlayerData, healTrigger: 150 });
			if (autoRes && autoRes.result && autoRes.result.used) {
				const res = autoRes.result;
				if (res.hpDelta) {
					a.hp = Math.min(attacker.stats.hp || 0, a.hp + res.hpDelta);
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
					aCharacter.skillCooldowns = Object.assign(
						{},
						aCharacter.skillCooldowns,
						res.cooldown.skillCooldowns
					);
				}
				if (res.applied && res.buff) {
					aCharacter.activeBuffs = Object.assign({}, aCharacter.activeBuffs, { [res.buff.id]: res.buff });
				}
				log('SKILL_CAST', {
					simTime,
					round,
					actor: attacker.name,
					skill: autoRes.skillId,
					detail: res
				});
			}

			if (d.hp > 0 && a.hp > 0) {
				const hitChance = computeHitChance(atk.acc, def.eva);
				const roll = rand();
				const hit = roll < hitChance;
				let raw = 0;
				let crit = false;
				if (hit) {
					const variance = 0.9 + rand() * 0.2;
					const baseHit = atk.dps * 1;
					crit = rand() < (atk.cr || 0);
					raw = baseHit * variance * (crit ? 2.0 : 1.0);
					// apply elemental modifiers if attacker has elemental blessing skills
					try {
						const mult = computeElementalMultiplierFor(attacker, defender.element || defender.stats?.element);
						raw = raw * mult;
					} catch (e) {
						// ignore and proceed
					}
					const afterDef = raw / (1 + (def.phyDef || 0) / 100);
					let damage = Math.max(0, Math.round(afterDef));
					const handle = handleIncomingDamage(dCharacter, dPlayerData, damage, {
						autoCast: true,
						now
					});
					if (handle && typeof handle.damageAfter === 'number') {
						const reduced = damage - handle.damageAfter || 0;
						damage = handle.damageAfter;
						if (
							handle.autoCastResult &&
							handle.autoCastResult.cooldown &&
							handle.autoCastResult.buff
						) {
							if (handle.autoCastResult.cooldown.skillCooldowns) {
								dCharacter.skillCooldowns = Object.assign(
									{},
									dCharacter.skillCooldowns,
									handle.autoCastResult.cooldown.skillCooldowns
								);
							}
							if (handle.autoCastResult.buff) {
								dCharacter.activeBuffs = Object.assign({}, dCharacter.activeBuffs, {
									magicBarrier: handle.autoCastResult.buff
								});
							}
							if (typeof handle.autoCastResult.spDelta === 'number') {
								d.sp = Math.max(0, (d.sp || 0) + handle.autoCastResult.spDelta);
								dPlayerData.sp = d.sp;
							}
						}
						log('DEFENSE_RESULT', { simTime, round, actor: defender.name, reduced, after: damage });
					}
					d.hp -= damage;
					
					// Check for reflection from defender
					const reflected = computeReflectDamage(defender, damage);
					if (reflected > 0) {
						a.hp -= reflected;
						aPlayerData.hp = a.hp;
						log('REFLECT_DAMAGE', {
							simTime,
							round,
							actor: defender.name,
							target: attacker.name,
							damage: reflected,
							targetHp: Math.max(0, a.hp)
						});
					}

					log('ATTACK_RESULT', {
						simTime,
						round,
						actor: attacker.name,
						target: defender.name,
						hit,
						roll,
						hitChance,
						crit,
						raw: Math.round(raw),
						damage,
						targetHp: Math.max(0, d.hp)
					});
				} else {
					log('ATTACK_RESULT', {
						simTime,
						round,
						actor: attacker.name,
						target: defender.name,
						hit: false,
						roll,
						hitChance
					});
				}
			}

			if (d.hp <= 0) {
				log('DEATH', { simTime, round, actor: defender.name });
				break;
			}

			nextAtkTime += attackerInterval;
			continue;
		}

		// Defender acts
		if (nextDefTime < nextAtkTime) {
			const hitChance = computeHitChance(def.acc, atk.eva);
			const roll = rand();
			const hit = roll < hitChance;
				if (hit) {
				const variance = 0.9 + rand() * 0.2;
				const baseHit = def.dps * 1;
				const crit = rand() < (def.cr || 0);
				let raw = baseHit * variance * (crit ? 2.0 : 1.0);
				// apply elemental modifiers when defender is the attacker (i.e., defender dealing damage to attacker)
				try {
						const mult = computeElementalMultiplierFor(defender, attacker.element || attacker.stats?.element);
						raw = raw * mult;
				} catch (e) {
					// ignore
				}
				const afterDef = raw / (1 + (atk.phyDef || 0) / 100);
				let damage = Math.max(0, Math.round(afterDef));
				const handle = handleIncomingDamage(aCharacter, aPlayerData, damage, {
					autoCast: true,
					now
				});
				if (handle && typeof handle.damageAfter === 'number') {
					const reduced = damage - handle.damageAfter || 0;
					damage = handle.damageAfter;
					if (
						handle.autoCastResult &&
						handle.autoCastResult.cooldown &&
						handle.autoCastResult.buff
					) {
						if (handle.autoCastResult.cooldown.skillCooldowns) {
							aCharacter.skillCooldowns = Object.assign(
								{},
								aCharacter.skillCooldowns,
								handle.autoCastResult.cooldown.skillCooldowns
							);
						}
						if (handle.autoCastResult.buff) {
							aCharacter.activeBuffs = Object.assign({}, aCharacter.activeBuffs, {
								magicBarrier: handle.autoCastResult.buff
							});
						}
						if (typeof handle.autoCastResult.spDelta === 'number') {
							a.sp = Math.max(0, (a.sp || 0) + handle.autoCastResult.spDelta);
							aPlayerData.sp = a.sp;
						}
					}
					log('DEFENSE_RESULT', { simTime, round, actor: attacker.name, reduced, after: damage });
				}
				a.hp -= damage;

				// Check for reflection from attacker
				const reflected = computeReflectDamage(attacker, damage);
				if (reflected > 0) {
					d.hp -= reflected;
					dPlayerData.hp = d.hp;
					log('REFLECT_DAMAGE', {
						simTime,
						round,
						actor: attacker.name,
						target: defender.name,
						damage: reflected,
						targetHp: Math.max(0, d.hp)
					});
				}

				log('ATTACK_RESULT', {
					simTime,
					round,
					actor: defender.name,
					target: attacker.name,
					hit,
					roll,
					hitChance,
					crit: crit,
					raw: Math.round(raw),
					damage,
					targetHp: Math.max(0, a.hp)
				});
			} else {
				log('ATTACK_RESULT', {
					simTime,
					round,
					actor: defender.name,
					target: attacker.name,
					hit: false,
					roll,
					hitChance
				});
			}

			if (a.hp <= 0) {
				log('DEATH', { simTime, round, actor: attacker.name });
				break;
			}
			nextDefTime += defenderInterval;
			continue;
		}
	}

	return {
		seed,
		logs,
		final: {
			attackerHp: a.hp,
			defenderHp: d.hp
		}
	};
}

export { deterministicFight, simulateFight };

export default { deterministicFight, simulateFight };
